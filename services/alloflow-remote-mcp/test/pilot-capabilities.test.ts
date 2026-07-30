import { describe, expect, it } from "vitest";

import {
  PILOT_TOOL_NAMES,
  REMOTE_MCP_VERSION,
} from "../src/pilot-capabilities";

describe("remote capability contract", () => {
  it("versions and advertises the complete accepted-pilot tool surface", () => {
    expect(REMOTE_MCP_VERSION).toBe("0.3.0");
    expect(PILOT_TOOL_NAMES).toEqual([
      "remediation_capabilities",
      "create_document_upload",
      "start_remediation",
      "get_remediation_status",
      "get_remediation_report",
      "get_remediation_result",
      "cancel_remediation",
      "delete_remediation",
    ]);
  });
});
