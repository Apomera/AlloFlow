#!/usr/bin/env python3
"""Generate the tiny offline Muraro pancreas snapshot used by Cell Atlas Lab.

Input:
  The exact public H5AD asset identified by the CELLxGENE collection API.

Output:
  A deterministic browser-ready JavaScript data artifact containing only
  pooled and pseudonymous replicate-level cell counts, marker detection
  frequencies, and mean raw counts. It contains no cell-level rows, original
  donor identifiers, or sequences.

Dependencies:
  Python 3.10+, numpy, h5py

Example:
  python dev-tools/generate_cellatlas_real_snapshot.py \
    --input C:/tmp/muraro-pancreas-ac56150b.h5ad \
    --output stem_lab/stem_data_cellatlas_muraro.js
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import h5py
import numpy as np


ASSET_URL = (
    "https://datasets.cellxgene.cziscience.com/"
    "ac56150b-add4-4336-9059-6d3d3ce17f3b.h5ad"
)
EXPECTED_SHA256 = "183673651cfa8c473a26641d42011d43be44eb2fea44e6e6ab8e2b0065d07483"
COLLECTION_ID = "6e8c5415-302c-492a-a5f9-f29c57ff18fb"
DATASET_ID = "b07e5164-baf6-43d2-bdba-5a249d0da879"
DATASET_VERSION_ID = "ac56150b-add4-4336-9059-6d3d3ce17f3b"
HCA_PROJECT_ID = "894ae6ac-5b48-41a8-a72f-315a9b60a62e"

GENES = ["INS", "GCG", "SST", "KRT19", "PRSS1", "COL3A1", "KDR", "PTPRC"]
CELL_TYPE_MAP = [
    ("beta", "type B pancreatic cell"),
    ("alpha", "pancreatic A cell"),
    ("delta", "pancreatic D cell"),
    ("ductal", "pancreatic ductal cell"),
    ("acinar", "pancreatic acinar cell"),
    ("stellate", "mesenchymal cell"),
    ("endothelial", "endothelial cell"),
    ("immune", None),
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def decode_value(value):
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if isinstance(value, np.bytes_):
        return value.tobytes().decode("utf-8")
    return str(value)


def read_categorical(group: h5py.Group) -> np.ndarray:
    categories = np.array([decode_value(value) for value in group["categories"][...]], dtype=object)
    codes = group["codes"][...]
    result = np.empty(codes.shape[0], dtype=object)
    for index, code in enumerate(codes):
        result[index] = categories[int(code)] if int(code) >= 0 else None
    return result


def read_string_column(node) -> np.ndarray:
    if isinstance(node, h5py.Group) and node.attrs.get("encoding-type") == "categorical":
        return read_categorical(node)
    return np.array([decode_value(value) for value in node[...]], dtype=object)


def summarize_gene_rows(
    rows: np.ndarray,
    genes: list[str],
    feature_index: dict[str, int],
    data: np.ndarray,
    indices: np.ndarray,
    indptr: np.ndarray,
) -> dict:
    count = int(rows.size)
    summaries = {}
    for gene in genes:
        column = feature_index[gene]
        detected = 0
        total_raw = 0.0
        for row in rows:
            start, stop = int(indptr[row]), int(indptr[row + 1])
            row_columns = indices[start:stop]
            matches = np.flatnonzero(row_columns == column)
            if matches.size:
                value = float(data[start + int(matches[0])])
                total_raw += value
                if value > 0:
                    detected += 1
        summaries[gene] = {
            "detectedCells": int(detected),
            "detectionPct": round((detected / count * 100.0) if count else 0.0, 1),
            "meanRawCount": round((total_raw / count) if count else 0.0, 3),
        }
    return summaries


def add_relative_means(cell_summaries: dict) -> None:
    for gene in GENES:
        available_means = [
            summary["genes"][gene]["meanRawCount"]
            for summary in cell_summaries.values()
            if summary["available"]
        ]
        maximum = max(available_means) if available_means else 0.0
        for summary in cell_summaries.values():
            if summary["available"]:
                mean_raw = summary["genes"][gene]["meanRawCount"]
                summary["genes"][gene]["relativeMeanPct"] = round(
                    (mean_raw / maximum * 100.0) if maximum else 0.0, 1
                )


def summarize(input_path: Path) -> dict:
    checksum = sha256_file(input_path)
    if checksum.lower() != EXPECTED_SHA256:
        raise RuntimeError(
            "Input checksum does not match the pinned CELLxGENE dataset version.\n"
            f"Expected: {EXPECTED_SHA256}\nActual:   {checksum}"
        )

    with h5py.File(input_path, "r") as h5:
        cell_types = read_string_column(h5["obs"]["cell_type"])
        donors = read_string_column(h5["obs"]["donor_id"])
        feature_names = read_string_column(h5["raw"]["var"]["feature_name"])
        matrix = h5["raw"]["X"]
        shape = tuple(int(value) for value in matrix.attrs["shape"])
        if shape != (2126, 15643):
            raise RuntimeError(f"Unexpected raw matrix shape: {shape}")

        feature_index = {}
        for index, name in enumerate(feature_names):
            if name not in feature_index:
                feature_index[name] = index
        missing = [gene for gene in GENES if gene not in feature_index]
        if missing:
            raise RuntimeError(f"Required marker genes missing from raw matrix: {missing}")

        data = matrix["data"][...]
        indices = matrix["indices"][...]
        indptr = matrix["indptr"][...]

        cell_summaries = {}
        for app_id, source_label in CELL_TYPE_MAP:
            if source_label is None:
                cell_summaries[app_id] = {
                    "available": False,
                    "sourceCellType": None,
                    "reason": (
                        "The curated CELLxGENE dataset does not list a broad immune-cell "
                        "annotation, so this real-data snapshot does not fabricate one."
                    ),
                    "cellCount": 0,
                    "donorCount": 0,
                    "genes": {},
                }
                continue

            rows = np.flatnonzero(cell_types == source_label)
            donor_count = len({donors[row] for row in rows if donors[row] is not None})
            cell_summaries[app_id] = {
                "available": True,
                "sourceCellType": source_label,
                "cellCount": int(rows.size),
                "donorCount": int(donor_count),
                "genes": summarize_gene_rows(rows, GENES, feature_index, data, indices, indptr),
            }

        add_relative_means(cell_summaries)

        donor_values = sorted({value for value in donors if value is not None})
        replicates = []
        for replicate_index, source_donor in enumerate(donor_values):
            donor_rows = np.flatnonzero(donors == source_donor)
            replicate_cells = {}
            for app_id, source_label in CELL_TYPE_MAP:
                if source_label is None:
                    replicate_cells[app_id] = {
                        "available": False,
                        "sourceCellType": None,
                        "reason": "No mapped immune annotation is available in this source replicate.",
                        "cellCount": 0,
                        "lowCellCount": True,
                        "genes": {},
                    }
                    continue
                rows = np.flatnonzero((donors == source_donor) & (cell_types == source_label))
                count = int(rows.size)
                if count == 0:
                    replicate_cells[app_id] = {
                        "available": False,
                        "sourceCellType": source_label,
                        "reason": "This mapped identity has no cells in the source replicate.",
                        "cellCount": 0,
                        "lowCellCount": True,
                        "genes": {},
                    }
                    continue
                replicate_cells[app_id] = {
                    "available": True,
                    "sourceCellType": source_label,
                    "cellCount": count,
                    "lowCellCount": count < 10,
                    "genes": summarize_gene_rows(rows, GENES, feature_index, data, indices, indptr),
                }
            add_relative_means(replicate_cells)
            replicates.append(
                {
                    "id": f"replicate_{chr(97 + replicate_index)}",
                    "label": f"Replicate {chr(65 + replicate_index)}",
                    "primaryCellCount": int(donor_rows.size),
                    "mappedCellCount": sum(
                        item["cellCount"] for item in replicate_cells.values() if item["available"]
                    ),
                    "cellTypes": replicate_cells,
                }
            )

        return {
            "snapshotVersion": 2,
            "id": "muraro-pancreas-aggregates-v2",
            "title": "Muraro pancreas aggregate and replicate snapshot",
            "metric": {
                "id": "rawDetectionFrequency",
                "label": "cells with detected raw RNA",
                "unit": "percent",
                "definition": (
                    "For each curated source cell type, the percentage of cells whose raw "
                    "count for the selected gene is greater than zero."
                ),
                "secondaryMetric": (
                    "meanRawCount is the arithmetic mean raw count across all cells in the "
                    "source cell type and is provided for audit, not cross-study comparison."
                ),
                "relativeMetric": (
                    "relativeMeanPct divides a cell type's mean raw count by the largest "
                    "mean among the displayed mapped cell types for the same gene. It is "
                    "valid only as a within-gene teaching comparison."
                ),
            },
            "source": {
                "title": "A Single-Cell Transcriptome Atlas of the Human Pancreas",
                "citation": "Muraro et al. (2016), Cell Systems",
                "doi": "10.1016/j.cels.2016.09.002",
                "hcaProjectId": HCA_PROJECT_ID,
                "collectionId": COLLECTION_ID,
                "datasetId": DATASET_ID,
                "datasetVersionId": DATASET_VERSION_ID,
                "assetUrl": ASSET_URL,
                "assetSha256": checksum,
                "assetBytes": int(input_path.stat().st_size),
                "schemaVersion": "7.1.0",
                "assay": "CEL-seq2",
                "rawMatrixShape": list(shape),
                "primaryCellCount": int(shape[0]),
                "featureCount": int(shape[1]),
                "donorCount": len(set(donors)),
                "license": "CC BY 4.0",
            },
            "privacy": {
                "aggregateOnly": True,
                "containsCellRows": False,
                "containsDonorIdentifiers": False,
                "containsSequences": False,
            },
            "genes": GENES,
            "cellTypes": cell_summaries,
            "replicatePolicy": {
                "pseudonymized": True,
                "sourceDonorIdsIncluded": False,
                "labels": "Source donor categories are deterministically relabeled Replicate A-D; the mapping is not exported.",
                "lowCellCountThreshold": 10,
                "warning": (
                    "Replicate labels are pseudonyms, not proof of anonymity. Counts and expression "
                    "summaries remain aggregate-only and must not be used for donor identification."
                ),
            },
            "replicates": replicates,
        }


def write_javascript(snapshot: dict, output_path: Path) -> None:
    payload = json.dumps(snapshot, indent=2, sort_keys=True, ensure_ascii=True)
    content = (
        "// Generated by dev-tools/generate_cellatlas_real_snapshot.py\n"
        "// Aggregate-only snapshot; do not edit by hand.\n"
        "(function (root) {\n"
        "  'use strict';\n"
        "  root.__alloCellAtlasRealSnapshots = root.__alloCellAtlasRealSnapshots || {};\n"
        "  root.__alloCellAtlasRealSnapshots.muraroPancreas = "
        + payload.replace("\n", "\n  ")
        + ";\n"
        "})(typeof window !== 'undefined' ? window : globalThis);\n"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8", newline="\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    snapshot = summarize(args.input)
    write_javascript(snapshot, args.output)
    print(
        f"Wrote {args.output} with "
        f"{snapshot['source']['primaryCellCount']} aggregate source cells."
    )


if __name__ == "__main__":
    main()
