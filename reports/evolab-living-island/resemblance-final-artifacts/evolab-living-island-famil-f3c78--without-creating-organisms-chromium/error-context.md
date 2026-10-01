# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> family resemblance compares real parents and offspring and explores allele pairings without creating organisms
- Location: tests\e2e\evolab-living-island.spec.ts:1703:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -     4
+ Received  + 16073

@@ -1,8 +1,8 @@
  Object {
-   "generation": 1,
-   "habitat": "meadow",
+   "generation": 6,
+   "habitat": "drought",
    "history": Array [
      Object {
        "event": "arrival",
        "generation": 0,
        "habitat": "meadow",
@@ -4084,16 +4084,16085 @@
          31,
          32,
          33,
          34,
          35,
+       ],
+     },
+     Object {
+       "event": "steady",
+       "generation": 2,
+       "habitat": "meadow",
+       "mutationRate": 0.2,
+       "mutations": 84,
+       "population": Array [
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.411440203897655,
+               0.7065469003282487,
+             ],
+             "legs": Array [
+               0.7414607170503587,
+               0.11655567865818739,
+             ],
+             "shade": Array [
+               0.5424016224499791,
+               0.6915931584406644,
+             ],
+           },
+           "id": 97,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.061483615459874276,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             52,
+             63,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.07450387588702138,
+               0.12170918724499642,
+             ],
+             "legs": Array [
+               0.20528416343033315,
+               0.00244676461443305,
+             ],
+             "shade": Array [
+               0.6476160306483507,
+               0.14918588211759926,
+             ],
+           },
+           "id": 98,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.10720922751352192,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.0453461918886751,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.06392139296978713,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             77,
+             83,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.06562787876464427,
+             ],
+             "legs": Array [
+               0.33090538710355755,
+               0.8676796234212816,
+             ],
+             "shade": Array [
+               0.9548127378802747,
+               0.7686254936642944,
+             ],
+           },
+           "id": 99,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.12013858960010113,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             45,
+             69,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.560151020726189,
+               0.7648110222071409,
+             ],
+             "legs": Array [
+               0.5354745120275766,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.2461479352787137,
+               0.5670610630046576,
+             ],
+           },
+           "id": 100,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.13466310095041992,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             44,
+             50,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.48096869233995676,
+               0.23095463309437037,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.625098321037367,
+             ],
+             "shade": Array [
+               0.8986494904384017,
+               0.5955402408726513,
+             ],
+           },
+           "id": 101,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.06357431217096747,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             73,
+             84,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.21502661099657416,
+               0.2363890316337347,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.7286613265331835,
+             ],
+             "shade": Array [
+               0.11901320960372685,
+               0.8064792235381901,
+             ],
+           },
+           "id": 102,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.0930451664607972,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.07997618716210128,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.12713472567498685,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             95,
+             70,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.8555065228138119,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.5386320076789707,
+               0.19138588507659735,
+             ],
+             "shade": Array [
+               0.1347323467489332,
+               0.20930666290223598,
+             ],
+           },
+           "id": 103,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.022892001187428835,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.0872751745209098,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             77,
+             64,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.7065469003282487,
+             ],
+             "legs": Array [
+               0.16249951347708702,
+               0.7794031627103686,
+             ],
+             "shade": Array [
+               0.9986961587518454,
+               0.7986817082762718,
+             ],
+           },
+           "id": 104,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             51,
+             55,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.5134868054650724,
+               0.30807177745737135,
+             ],
+             "legs": Array [
+               0.11655567865818739,
+               0.7414607170503587,
+             ],
+             "shade": Array [
+               0.8602004407439381,
+               0.980795765761286,
+             ],
+           },
+           "id": 105,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.10435148826800288,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             63,
+             68,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.31956706452183425,
+               0.411440203897655,
+             ],
+             "legs": Array [
+               0.20906156733632086,
+               0.5354745120275766,
+             ],
+             "shade": Array [
+               0.7614605769794435,
+               0.14673616201616824,
+             ],
+           },
+           "id": 106,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.12299227771349253,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.09708984250202776,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             59,
+             91,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.11119796920567751,
+               0.1709927093330771,
+             ],
+             "legs": Array [
+               0.09102044743485749,
+               0.7235142913181335,
+             ],
+             "shade": Array [
+               0.9986961587518454,
+               0.26761950738728046,
+             ],
+           },
+           "id": 107,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.05585740992799402,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.04748414865694941,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             51,
+             53,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.6382178370840847,
+               0.16249951347708702,
+             ],
+             "shade": Array [
+               0.7025482364743948,
+               0.8295872867479921,
+             ],
+           },
+           "id": 108,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.06906220369040966,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             45,
+             51,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.9276129815727472,
+               0.06562787876464427,
+             ],
+             "legs": Array [
+               0.00244676461443305,
+               0.8081071730703115,
+             ],
+             "shade": Array [
+               0.11848142048344015,
+               0.24119117971509693,
+             ],
+           },
+           "id": 109,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.02825474153272808,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.13350609667599203,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             41,
+             55,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.23550794083625076,
+               0.7856653339974582,
+             ],
+             "legs": Array [
+               0.2113906303420663,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.6987720851320773,
+               0.650075298268348,
+             ],
+           },
+           "id": 110,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.08405912368558348,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             59,
+             40,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.7648110222071409,
+               0.9048278306145221,
+             ],
+             "legs": Array [
+               0.3268562515731901,
+               0.3268562515731901,
+             ],
+             "shade": Array [
+               0.22503810073249042,
+               0.37469727639108896,
+             ],
+           },
+           "id": 111,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             76,
+             82,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.3401950745098293,
+               0.8219180947635323,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.7017241639550775,
+               0.7017241639550775,
+             ],
+           },
+           "id": 112,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.11255916690453888,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             64,
+             50,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.06562787876464427,
+               0.4091353171970695,
+             ],
+             "legs": Array [
+               0.9084888009540737,
+               0.10411071055568755,
+             ],
+             "shade": Array [
+               0.3498209267575294,
+               0.20930666290223598,
+             ],
+           },
+           "id": 113,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.10038162788376213,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.024876349633559586,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             55,
+             38,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.2363890316337347,
+               0.7808216102421284,
+             ],
+             "legs": Array [
+               0.6486851393710822,
+               0.7523807825986296,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.6211179897654802,
+             ],
+           },
+           "id": 114,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.11416294551454485,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             70,
+             65,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.2915158555842936,
+             ],
+             "legs": Array [
+               0.09102044743485749,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.8986494904384017,
+               0.0226871204841882,
+             ],
+           },
+           "id": 115,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.051141671258956196,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             86,
+             93,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.0384935203474015,
+               0.560151020726189,
+             ],
+             "legs": Array [
+               0.6889481151010841,
+               0.09435946551151575,
+             ],
+             "shade": Array [
+               0.021249190205708146,
+               0.2461479352787137,
+             ],
+           },
+           "id": 116,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.13191174804233016,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             89,
+             44,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.7648110222071409,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.3268562515731901,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.8829273341223598,
+               0.20930666290223598,
+             ],
+           },
+           "id": 117,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             76,
+             38,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.2246095539163798,
+               0.08941140724346042,
+             ],
+             "legs": Array [
+               0.11655567865818739,
+               0.8861112548038363,
+             ],
+             "shade": Array [
+               0.7463533013593405,
+               0.8935100373066962,
+             ],
+           },
+           "id": 118,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.1375618340726942,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.13044248076155782,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             66,
+             39,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.03835099900141356,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.1803816920053214,
+             ],
+             "shade": Array [
+               0.2689511015638709,
+               0.13528015432879328,
+             ],
+           },
+           "id": 119,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.054365890072658664,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.0013315941765904428,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             67,
+             62,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.4292301880195737,
+               0.6041411790065467,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.2522711756732315,
+             ],
+             "shade": Array [
+               0.6193750396929681,
+               0.7346967041958123,
+             ],
+           },
+           "id": 120,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.030700258575379853,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             40,
+             47,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.27764538255520166,
+               0.013297130325809134,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.46747251510620114,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.20930666290223598,
+             ],
+           },
+           "id": 121,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.07771995755843819,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.05735389282926918,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             81,
+             94,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.14054624262265858,
+               0.8774281365610659,
+             ],
+             "legs": Array [
+               0.11395362042821944,
+               0.00244676461443305,
+             ],
+             "shade": Array [
+               0.7630675565451384,
+               0.20627109331078827,
+             ],
+           },
+           "id": 122,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.001001561498269439,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             46,
+             41,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.22556298780255019,
+               0.288745768526569,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.6889481151010841,
+             ],
+             "shade": Array [
+               0.6612432815600187,
+               0.8064792235381901,
+             ],
+           },
+           "id": 123,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.06092458562925458,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.05235673689283431,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             42,
+             70,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.08941140724346042,
+               0.394018344655633,
+             ],
+             "legs": Array [
+               0.7838438537716865,
+               0.1056037752982229,
+             ],
+             "shade": Array [
+               0.7630675565451384,
+               0.7463533013593405,
+             ],
+           },
+           "id": 124,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             39,
+             66,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.013297130325809134,
+               0.23095463309437037,
+             ],
+             "legs": Array [
+               0.5248264079354703,
+               0.28142606373876333,
+             ],
+             "shade": Array [
+               0.7387384211178869,
+               0.5228857899364083,
+             ],
+           },
+           "id": 125,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             94,
+             84,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.2363890316337347,
+               0.6618188142497092,
+             ],
+             "legs": Array [
+               0.7016633785795421,
+               0.3268562515731901,
+             ],
+             "shade": Array [
+               0.13136522963643074,
+               0.22503810073249042,
+             ],
+           },
+           "id": 126,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.11900279599241914,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.05297823920845986,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.0025409234501421454,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             70,
+             76,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.7648110222071409,
+               0.28275798689574005,
+             ],
+             "legs": Array [
+               0.3268562515731901,
+               0.2529528344981372,
+             ],
+             "shade": Array [
+               0.8829273341223598,
+               0.6643707344774157,
+             ],
+           },
+           "id": 127,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.02672493192367256,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.09045332102105022,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             76,
+             74,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.6560275317169726,
+               0.411440203897655,
+             ],
+             "legs": Array [
+               0.6382178370840847,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.6094085583090783,
+               0.980795765761286,
+             ],
+           },
+           "id": 128,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.011709431456401945,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             65,
+             52,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.7263483961950987,
+             ],
+             "legs": Array [
+               0.20045411013998093,
+               0.16249951347708702,
+             ],
+             "shade": Array [
+               0.7671791681740433,
+               0.9986961587518454,
+             ],
+           },
+           "id": 129,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.12220721718855203,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.09634339958429337,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.06545500421896577,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             64,
+             51,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.5143227048683912,
+               0.1709927093330771,
+             ],
+             "legs": Array [
+               0.6889481151010841,
+               0.9981669674161822,
+             ],
+             "shade": Array [
+               0.12062089676968751,
+               0.25651873386465013,
+             ],
+           },
+           "id": 130,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.07011645709164441,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             89,
+             53,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.013297130325809134,
+               0.06562787876464427,
+             ],
+             "legs": Array [
+               0.5248264079354703,
+               0.7111496813222765,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.37469727639108896,
+             ],
+           },
+           "id": 131,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.06825348138809205,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             94,
+             55,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.7856653339974582,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.7847613242920488,
+               0.20930666290223598,
+             ],
+           },
+           "id": 132,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             40,
+             64,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.19428590849041938,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.013455504169687604,
+             ],
+             "shade": Array [
+               0.952009431226179,
+               0.9369378120172769,
+             ],
+           },
+           "id": 133,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.09722994709387422,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.1279072662908584,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.05335994078777731,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             86,
+             93,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.5261512697860599,
+               0.4292301880195737,
+             ],
+             "legs": Array [
+               0.8770720363408326,
+               0.13079777574166657,
+             ],
+             "shade": Array [
+               0.5424016224499791,
+               0.650075298268348,
+             ],
+           },
+           "id": 134,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.07339702837169171,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.13316973966546358,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             52,
+             40,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.2106858861632645,
+               0.6428805419337005,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.6612432815600187,
+               0.3788983194343746,
+             ],
+           },
+           "id": 135,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.0460474839899689,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.13275038415566087,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             42,
+             86,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.7065469003282487,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.7794031627103686,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.37469727639108896,
+             ],
+           },
+           "id": 136,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             38,
+             55,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.08941140724346042,
+               0.2363890316337347,
+             ],
+             "legs": Array [
+               0.8861112548038363,
+               0.6486851393710822,
+             ],
+             "shade": Array [
+               0.7630675565451384,
+               0.8064792235381901,
+             ],
+           },
+           "id": 137,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             39,
+             70,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.5324097526818514,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.7567479001544416,
+             ],
+           },
+           "id": 138,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.03157590836286545,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.018009479036554695,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             86,
+             73,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.013297130325809134,
+               0.1817131034005433,
+             ],
+             "legs": Array [
+               0.5248264079354703,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.30637422479689125,
+               0.1347323467489332,
+             ],
+           },
+           "id": 139,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.09706756189465524,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             94,
+             77,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.2505687508918345,
+               0.8555065228138119,
+             ],
+             "legs": Array [
+               0.00244676461443305,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.21020471617579461,
+             ],
+           },
+           "id": 140,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.08351337175816298,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.07547236942686142,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             83,
+             77,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.1817131034005433,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.07640893313102425,
+             ],
+             "shade": Array [
+               0.1347323467489332,
+               0.20930666290223598,
+             ],
+           },
+           "id": 141,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.10448839842341841,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             77,
+             94,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.2545648984517902,
+               0.8784296980593354,
+             ],
+             "legs": Array [
+               0.4510439767036587,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.9548127378802747,
+               0.14673616201616824,
+             ],
+           },
+           "id": 142,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             45,
+             41,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.8965627392940223,
+               0.2915158555842936,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.650075298268348,
+               0.9369378120172769,
+             ],
+           },
+           "id": 143,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.11089740529656411,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             40,
+             93,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.6041411790065467,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.16249951347708702,
+               0.1134222698584199,
+             ],
+             "shade": Array [
+               0.9986961587518454,
+               0.22909522880800068,
+             ],
+           },
+           "id": 144,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.012438914980739357,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.0197885659057647,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             51,
+             80,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.7648110222071409,
+               0.411440203897655,
+             ],
+             "legs": Array [
+               0.3268562515731901,
+               0.7414607170503587,
+             ],
+             "shade": Array [
+               0.8829273341223598,
+               0.9827805902902036,
+             ],
+           },
+           "id": 145,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.03642364394851029,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             76,
+             91,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.7974715446960181,
+               0.8555065228138119,
+             ],
+             "legs": Array [
+               0.9037906426843256,
+               0.9967193796765059,
+             ],
+             "shade": Array [
+               0.2461479352787137,
+               0.11203138361684978,
+             ],
+           },
+           "id": 146,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.044410032043233516,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.022700963132083418,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             95,
+             67,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.1383817049767822,
+               0.16463840217329562,
+             ],
+             "legs": Array [
+               0.3378296137228608,
+               0.04488904098980129,
+             ],
+             "shade": Array [
+               0.8602004407439381,
+               0.5554748592339456,
+             ],
+           },
+           "id": 147,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.12249276264570655,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.0065692302212119105,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             71,
+             42,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.06562787876464427,
+               0.6041411790065467,
+             ],
+             "legs": Array [
+               0.6486851393710822,
+               0.2522711756732315,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.9328739931806922,
+             ],
+           },
+           "id": 148,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             70,
+             47,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.5718465301394463,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.033190414942801005,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.8986494904384017,
+             ],
+           },
+           "id": 149,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.03229464886710048,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.12421086237765849,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             64,
+             51,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.08941140724346042,
+               0.769871924072504,
+             ],
+             "legs": Array [
+               0.23474758207798005,
+               0.05761069818399846,
+             ],
+             "shade": Array [
+               0.7659361851401627,
+               0.4391580219566822,
+             ],
+           },
+           "id": 150,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.10488881529308856,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.026174963470548394,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             62,
+             43,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.4292301880195737,
+               0.4018894190713763,
+             ],
+             "legs": Array [
+               0.00244676461443305,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.028454550774767995,
+             ],
+           },
+           "id": 151,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.11037356348708273,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             83,
+             93,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.2322918148897588,
+               0.2915158555842936,
+             ],
+             "legs": Array [
+               0.6382178370840847,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.9548127378802747,
+               0.9369378120172769,
+             ],
+           },
+           "id": 152,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.02227308356203139,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             45,
+             93,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.4189163212943822,
+               0.13933483010157943,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.7875359890051186,
+             ],
+             "shade": Array [
+               0.26761950738728046,
+               0.25651873386465013,
+             ],
+           },
+           "id": 153,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.00978100409731269,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.03165787923149765,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.016537549030035736,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             38,
+             53,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.4091353171970695,
+               0.35012904257513583,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.16249951347708702,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.8258813185058534,
+             ],
+           },
+           "id": 154,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.04064612375572324,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.11105649351142348,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             38,
+             74,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.08941140724346042,
+               0.2545648984517902,
+             ],
+             "legs": Array [
+               0.9177716217935086,
+               0.6382178370840847,
+             ],
+             "shade": Array [
+               0.2998927237931639,
+               0.6393320579174906,
+             ],
+           },
+           "id": 155,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.133927768021822,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.0632161785569042,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             39,
+             45,
+           ],
+         },
+         Object {
+           "born": 2,
+           "genes": Object {
+             "fur": Array [
+               0.12860933278687298,
+               0.1143470114748925,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.8676796234212816,
+             ],
+             "shade": Array [
+               0.7387384211178869,
+               0.7521478051692247,
+             ],
+           },
+           "id": 156,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.038446046346798546,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.048719132710248234,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             73,
+             69,
+           ],
+         },
+       ],
+       "selection": true,
+       "stats": Object {
+         "diversity": 0.2274778718022013,
+         "means": Object {
+           "fur": 0.3915012485454012,
+           "legs": 0.44974778799340126,
+           "shade": 0.5412798511857012,
+         },
+         "size": 60,
+       },
+       "survivors": Array [
+         37,
+         38,
+         39,
+         40,
+         41,
+         42,
+         43,
+         44,
+         45,
+         46,
+         47,
+         50,
+         51,
+         52,
+         53,
+         55,
+         59,
+         60,
+         61,
+         62,
+         63,
+         64,
+         65,
+         66,
+         67,
+         68,
+         69,
+         70,
+         71,
+         72,
+         73,
+         74,
+         76,
+         77,
+         80,
+         81,
+         82,
+         83,
+         84,
+         86,
+         89,
+         91,
+         93,
+         94,
+         95,
+       ],
+     },
+     Object {
+       "event": "steady",
+       "generation": 3,
+       "habitat": "meadow",
+       "mutationRate": 0.2,
+       "mutations": 76,
+       "population": Array [
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.12860933278687298,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.033190414942801005,
+             ],
+             "shade": Array [
+               0.7387384211178869,
+               0.241973628224805,
+             ],
+           },
+           "id": 157,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.03266696532256901,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             156,
+             149,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.4091353171970695,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.9599646357819438,
+               0.07640893313102425,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.1347323467489332,
+             ],
+           },
+           "id": 158,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.13154656326398254,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             113,
+             141,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.6254741936456413,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.10724500931799413,
+             ],
+             "shade": Array [
+               0.8829273341223598,
+               0.20930666290223598,
+             ],
+           },
+           "id": 159,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.05362766350619495,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.07405459437519313,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             117,
+             149,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.394018344655633,
+               0.6103826371673494,
+             ],
+             "legs": Array [
+               0.1056037752982229,
+               0.1134222698584199,
+             ],
+             "shade": Array [
+               0.7463533013593405,
+               0.22909522880800068,
+             ],
+           },
+           "id": 160,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.006241458160802723,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             124,
+             144,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.48096869233995676,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.6087459124159067,
+             ],
+             "shade": Array [
+               0.7521478051692247,
+               0.5955402408726513,
+             ],
+           },
+           "id": 161,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.0163524086214602,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             156,
+             101,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.06562787876464427,
+               0.411440203897655,
+             ],
+             "legs": Array [
+               0.33090538710355755,
+               0.6382178370840847,
+             ],
+             "shade": Array [
+               0.7686254936642944,
+               0.980795765761286,
+             ],
+           },
+           "id": 162,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             99,
+             128,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.2363890316337347,
+               0.5718465301394463,
+             ],
+             "legs": Array [
+               0.9686126430518925,
+               0.10411071055568755,
+             ],
+             "shade": Array [
+               0.11901320960372685,
+               0.7940824445988983,
+             ],
+           },
+           "id": 163,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.02041196832433343,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.10456704583950342,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             102,
+             149,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.4517109959758818,
+               0.8555065228138119,
+             ],
+             "legs": Array [
+               0.20906156733632086,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.08442001892253756,
+               0.21020471617579461,
+             ],
+           },
+           "id": 164,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.04027079207822681,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.06231614309363068,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             106,
+             140,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.3065178843028844,
+               0.8058617603406311,
+             ],
+             "legs": Array [
+               0.7235142913181335,
+               0.6486851393710822,
+             ],
+             "shade": Array [
+               0.9986961587518454,
+               0.8064792235381901,
+             ],
+           },
+           "id": 165,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.1355251749698073,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.025040150098502637,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             107,
+             114,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.28275798689574005,
+               0.2246095539163798,
+             ],
+             "legs": Array [
+               0.31698568727821114,
+               0.8861112548038363,
+             ],
+             "shade": Array [
+               0.8829273341223598,
+               0.8935100373066962,
+             ],
+           },
+           "id": 166,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.009870564294978977,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             127,
+             118,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.03835099900141356,
+               0.4018894190713763,
+             ],
+             "legs": Array [
+               0.1803816920053214,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.2689511015638709,
+               0.11607686652801932,
+             ],
+           },
+           "id": 167,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.08762231575325133,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             119,
+             151,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.4292301880195737,
+               0.7065469003282487,
+             ],
+             "legs": Array [
+               0.13079777574166657,
+               0.11655567865818739,
+             ],
+             "shade": Array [
+               0.650075298268348,
+               0.6915931584406644,
+             ],
+           },
+           "id": 168,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             134,
+             97,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.60826499636285,
+               0.5718465301394463,
+             ],
+             "legs": Array [
+               0.1134222698584199,
+               0.1365806243289262,
+             ],
+             "shade": Array [
+               0.22909522880800068,
+               0.8986494904384017,
+             ],
+           },
+           "id": 169,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.004123817356303335,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.032469913773238664,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             144,
+             149,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.7648110222071409,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.13860262795351447,
+             ],
+           },
+           "id": 170,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.09005282904952765,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.07070403494872153,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             138,
+             117,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.2363890316337347,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.8861112548038363,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.8064792235381901,
+             ],
+           },
+           "id": 171,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             138,
+             137,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.06562787876464427,
+               0.8965627392940223,
+             ],
+             "legs": Array [
+               0.9334141145180911,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.11848142048344015,
+               0.650075298268348,
+             ],
+           },
+           "id": 172,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.12530694144777954,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             109,
+             143,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.4018894190713763,
+               0.2545648984517902,
+             ],
+             "legs": Array [
+               0.27306122542358935,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.08462439485825599,
+             ],
+           },
+           "id": 173,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.06211176715791226,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             151,
+             142,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.7065469003282487,
+               0.0907169745955616,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.2689511015638709,
+             ],
+           },
+           "id": 174,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.052365975594148045,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             136,
+             119,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.2363890316337347,
+               0.4292301880195737,
+             ],
+             "legs": Array [
+               0.8861112548038363,
+               0.13079777574166657,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.5424016224499791,
+             ],
+           },
+           "id": 175,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             137,
+             134,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.015277567021548762,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.5248264079354703,
+               0.6401723040733487,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.0011761614400893627,
+             ],
+           },
+           "id": 176,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.0019804366957396273,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.10154029639437796,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.13590850818902256,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             131,
+             103,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.4738291495945305,
+               0.12170918724499642,
+             ],
+             "legs": Array [
+               0.13079777574166657,
+               0.20528416343033315,
+             ],
+             "shade": Array [
+               0.650075298268348,
+               0.14918588211759926,
+             ],
+           },
+           "id": 177,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.044598961574956776,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             134,
+             98,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.11119796920567751,
+               0.19428590849041938,
+             ],
+             "legs": Array [
+               0.09102044743485749,
+               0.01755842450074849,
+             ],
+             "shade": Array [
+               0.9986961587518454,
+               0.9369378120172769,
+             ],
+           },
+           "id": 178,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.0041029203310608865,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             107,
+             133,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.411440203897655,
+               0.27764538255520166,
+             ],
+             "legs": Array [
+               0.6382178370840847,
+               0.10411071055568755,
+             ],
+             "shade": Array [
+               0.6094085583090783,
+               0.20930666290223598,
+             ],
+           },
+           "id": 179,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             128,
+             121,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.1383817049767822,
+             ],
+             "legs": Array [
+               0.5324097526818514,
+               0.39819493104703724,
+             ],
+             "shade": Array [
+               0.7567479001544416,
+               0.8602004407439381,
+             ],
+           },
+           "id": 180,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.06036531732417644,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             138,
+             147,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.08941140724346042,
+               0.17851312248967588,
+             ],
+             "legs": Array [
+               0.18584776181727647,
+               0.07640893313102425,
+             ],
+             "shade": Array [
+               0.7463533013593405,
+               0.10434154666028916,
+             ],
+           },
+           "id": 181,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.021412302507087592,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.0692920831590891,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.030390800088644032,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             118,
+             141,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.12170918724499642,
+               0.9048278306145221,
+             ],
+             "legs": Array [
+               0.0749032963719219,
+               0.33090538710355755,
+             ],
+             "shade": Array [
+               0.6476160306483507,
+               0.9548127378802747,
+             ],
+           },
+           "id": 182,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.07735006098635495,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             98,
+             99,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.23095463309437037,
+               0.10235787644982339,
+             ],
+             "legs": Array [
+               0.625098321037367,
+               0.09102044743485749,
+             ],
+             "shade": Array [
+               0.8986494904384017,
+               0.26761950738728046,
+             ],
+           },
+           "id": 183,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.00884009275585413,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             101,
+             107,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.3401950745098293,
+               0.23533845633268358,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.3378296137228608,
+             ],
+             "shade": Array [
+               0.7017241639550775,
+               0.5554748592339456,
+             ],
+           },
+           "id": 184,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.07070005415938796,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             112,
+             147,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.8965627392940223,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.033190414942801005,
+             ],
+             "shade": Array [
+               0.5186047530733049,
+               0.8986494904384017,
+             ],
+           },
+           "id": 185,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.1314705451950431,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             143,
+             149,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.08941140724346042,
+               0.08941140724346042,
+             ],
+             "legs": Array [
+               0.6486851393710822,
+               0.8861112548038363,
+             ],
+             "shade": Array [
+               0.7630675565451384,
+               0.8935100373066962,
+             ],
+           },
+           "id": 186,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             137,
+             118,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.041226946236565726,
+               0.7648110222071409,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.2529528344981372,
+             ],
+             "shade": Array [
+               0.42002532733604314,
+               0.8829273341223598,
+             ],
+           },
+           "id": 187,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.10685482500120999,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.07020440057851375,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             113,
+             127,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.2106858861632645,
+             ],
+             "legs": Array [
+               0.2027339621726423,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.7686254936642944,
+               0.3788983194343746,
+             ],
+           },
+           "id": 188,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.12817142493091524,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             99,
+             135,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.7065469003282487,
+               0.7065469003282487,
+             ],
+             "legs": Array [
+               0.7794031627103686,
+               0.7414607170503587,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.6266684285830706,
+             ],
+           },
+           "id": 189,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.06492472985759377,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             136,
+             97,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.6428805419337005,
+               0.013297130325809134,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.7111496813222765,
+             ],
+             "shade": Array [
+               0.6242767372727394,
+               0.37469727639108896,
+             ],
+           },
+           "id": 190,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.03696654428727925,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             135,
+             131,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.31956706452183425,
+               0.08941140724346042,
+             ],
+             "legs": Array [
+               0.20906156733632086,
+               0.23474758207798005,
+             ],
+             "shade": Array [
+               0.06436011563055216,
+               0.8870907546859235,
+             ],
+           },
+           "id": 191,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.08237604638561608,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.12115456954576076,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             106,
+             150,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.30807177745737135,
+               0.7648110222071409,
+             ],
+             "legs": Array [
+               0.11655567865818739,
+               0.3268562515731901,
+             ],
+             "shade": Array [
+               0.8602004407439381,
+               0.20930666290223598,
+             ],
+           },
+           "id": 192,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             105,
+             117,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.5099222660437226,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.27306122542358935,
+               0.10411071055568755,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.37469727639108896,
+             ],
+           },
+           "id": 193,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.10803284697234632,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             151,
+             136,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.7648110222071409,
+               0.3435523348581046,
+             ],
+             "legs": Array [
+               0.3268562515731901,
+               0.7875359890051186,
+             ],
+             "shade": Array [
+               0.4502500294428319,
+               0.25651873386465013,
+             ],
+           },
+           "id": 194,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.07536398643627763,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.07555275305174292,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             111,
+             153,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.22305015598423777,
+               0.5134868054650724,
+             ],
+             "legs": Array [
+               0.19701328247785568,
+               0.20539353399537505,
+             ],
+             "shade": Array [
+               0.650075298268348,
+               0.8602004407439381,
+             ],
+           },
+           "id": 195,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.06846569960005582,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.055650512017309674,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.08883785533718766,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             143,
+             105,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.3923278773389757,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.7719872698560357,
+               0.20930666290223598,
+             ],
+           },
+           "id": 196,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.01680743985809386,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.019839464686810974,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             156,
+             154,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.48096869233995676,
+               0.11119796920567751,
+             ],
+             "legs": Array [
+               0.6736146545596421,
+               0.09136741694994271,
+             ],
+             "shade": Array [
+               0.4964051085524261,
+               0.26761950738728046,
+             ],
+           },
+           "id": 197,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.04851633352227509,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.0003469695150852204,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.09913513232022525,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             101,
+             107,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.7648110222071409,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.09020725303329527,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.8829273341223598,
+               0.20930666290223598,
+             ],
+           },
+           "id": 198,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.01729914042167366,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             117,
+             132,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.9276129815727472,
+               0.3401950745098293,
+             ],
+             "legs": Array [
+               0.1286460286937654,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.11848142048344015,
+               0.7017241639550775,
+             ],
+           },
+           "id": 199,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.13109279330819845,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             109,
+             112,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.8555065228138119,
+               0.0998976611532271,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.7235142913181335,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.26761950738728046,
+             ],
+           },
+           "id": 200,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.07109504817984999,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             140,
+             107,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.2915158555842936,
+               0.1143470114748925,
+             ],
+             "legs": Array [
+               0.6382178370840847,
+               0.8994981824140996,
+             ],
+             "shade": Array [
+               0.9369378120172769,
+               0.8229788685124367,
+             ],
+           },
+           "id": 201,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.031818558992818,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.08424044739454986,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             152,
+             156,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.7856653339974582,
+               0.06562787876464427,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.00244676461443305,
+             ],
+             "shade": Array [
+               0.23613477831706406,
+               0.24119117971509693,
+             ],
+           },
+           "id": 202,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.026828115414828064,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             132,
+             109,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.3541899673361331,
+               0.12170918724499642,
+             ],
+             "legs": Array [
+               0.7286613265331835,
+               0.20528416343033315,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.14918588211759926,
+             ],
+           },
+           "id": 203,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.11780093570239843,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             102,
+             98,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.08941140724346042,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.8861112548038363,
+               0.3268562515731901,
+             ],
+             "shade": Array [
+               0.8935100373066962,
+               0.8829273341223598,
+             ],
+           },
+           "id": 204,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             118,
+             117,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.5282949700206518,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.4753607284091413,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.14673616201616824,
+             ],
+           },
+           "id": 205,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.11685476612299682,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.06011378361843527,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             149,
+             106,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.18792986148037014,
+               0.16463840217329562,
+             ],
+             "legs": Array [
+               0.2038017403241247,
+               0.24416710684075948,
+             ],
+             "shade": Array [
+               0.8935100373066962,
+               0.8602004407439381,
+             ],
+           },
+           "id": 206,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.03667969243600965,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.08724606166593732,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.0936625068821013,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             118,
+             147,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.9276129815727472,
+               0.5261512697860599,
+             ],
+             "legs": Array [
+               0.00244676461443305,
+               0.13079777574166657,
+             ],
+             "shade": Array [
+               0.11848142048344015,
+               0.650075298268348,
+             ],
+           },
+           "id": 207,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             109,
+             134,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.2915158555842936,
+               0.560151020726189,
+             ],
+             "legs": Array [
+               0.08026945180259645,
+               0.09435946551151575,
+             ],
+             "shade": Array [
+               0.0226871204841882,
+               0.028229425437748437,
+             ],
+           },
+           "id": 208,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.01075099563226104,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.04947861564345658,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             115,
+             116,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.126432889662683,
+               0.1817131034005433,
+             ],
+             "legs": Array [
+               0.8676796234212816,
+               0.03676586960442364,
+             ],
+             "shade": Array [
+               0.7521478051692247,
+               0.1347323467489332,
+             ],
+           },
+           "id": 209,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.012085878187790514,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.11317480273544789,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             156,
+             141,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.033190414942801005,
+               0.1134222698584199,
+             ],
+             "shade": Array [
+               0.8986494904384017,
+               0.22909522880800068,
+             ],
+           },
+           "id": 210,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             149,
+             144,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.33138908142223955,
+               0.30807177745737135,
+             ],
+             "legs": Array [
+               0.07640893313102425,
+               0.11655567865818739,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.9665387888066471,
+             ],
+           },
+           "id": 211,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.13146365642547608,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.10633834806270899,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             141,
+             105,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.12170918724499642,
+               0.8555065228138119,
+             ],
+             "legs": Array [
+               0.1636562993284315,
+               0.00244676461443305,
+             ],
+             "shade": Array [
+               0.6476160306483507,
+               0.21020471617579461,
+             ],
+           },
+           "id": 212,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.041627864101901654,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             98,
+             140,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.394018344655633,
+               0.34507443387061354,
+             ],
+             "legs": Array [
+               0.7838438537716865,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.7630675565451384,
+               0.028454550774767995,
+             ],
+           },
+           "id": 213,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.08415575414896012,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             124,
+             151,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.2322918148897588,
+               0.28275798689574005,
+             ],
+             "legs": Array [
+               0.16250907485373317,
+               0.2529528344981372,
+             ],
+             "shade": Array [
+               0.9548127378802747,
+               0.8829273341223598,
+             ],
+           },
+           "id": 214,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.021146304393187168,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             152,
+             127,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.2915158555842936,
+             ],
+             "legs": Array [
+               0.7572654411103577,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.7686254936642944,
+               0.9569800948072225,
+             ],
+           },
+           "id": 215,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.11041418231092394,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.10608209317550064,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             99,
+             152,
+           ],
+         },
+         Object {
+           "born": 3,
+           "genes": Object {
+             "fur": Array [
+               0.21502661099657416,
+               0.013297130325809134,
+             ],
+             "legs": Array [
+               0.64922478816472,
+               0.7111496813222765,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.37469727639108896,
+             ],
+           },
+           "id": 216,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.07943653836846352,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             102,
+             131,
+           ],
+         },
+       ],
+       "selection": true,
+       "stats": Object {
+         "diversity": 0.2112117107272138,
+         "means": Object {
+           "fur": 0.37931504655187026,
+           "legs": 0.36698113425619283,
+           "shade": 0.5230788941508313,
+         },
+         "size": 60,
+       },
+       "survivors": Array [
+         97,
+         98,
+         99,
+         101,
+         102,
+         103,
+         105,
+         106,
+         107,
+         109,
+         111,
+         112,
+         113,
+         114,
+         115,
+         116,
+         117,
+         118,
+         119,
+         121,
+         124,
+         127,
+         128,
+         131,
+         132,
+         133,
+         134,
+         135,
+         136,
+         137,
+         138,
+         140,
+         141,
+         142,
+         143,
+         144,
+         147,
+         148,
+         149,
+         150,
+         151,
+         152,
+         153,
+         154,
+         156,
+       ],
+     },
+     Object {
+       "event": "steady",
+       "generation": 4,
+       "habitat": "meadow",
+       "mutationRate": 0.2,
+       "mutations": 69,
+       "population": Array [
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.23533845633268358,
+               0.4233337810263038,
+             ],
+             "legs": Array [
+               0.9952447748929262,
+               0.20539353399537505,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.9470541070960462,
+             ],
+           },
+           "id": 217,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.09015302443876863,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.005486550899222494,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.08685366635210813,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             184,
+             195,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.2106858861632645,
+               0.12170918724499642,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.16508579440414906,
+             ],
+             "shade": Array [
+               0.3788983194343746,
+               0.14918588211759926,
+             ],
+           },
+           "id": 218,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.0342880186624825,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             188,
+             177,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.5282949700206518,
+               0.06562787876464427,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.00244676461443305,
+             ],
+             "shade": Array [
+               0.25364343360066416,
+               0.24119117971509693,
+             ],
+           },
+           "id": 219,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.10690727158449591,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             205,
+             202,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.6254741936456413,
+               0.06562787876464427,
+             ],
+             "legs": Array [
+               0.10724500931799413,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.9699266041256488,
+               0.23613477831706406,
+             ],
+           },
+           "id": 220,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.086999270003289,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             159,
+             202,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.7974549684207887,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.7875359890051186,
+             ],
+             "shade": Array [
+               0.5955402408726513,
+               0.25651873386465013,
+             ],
+           },
+           "id": 221,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.032643946213647725,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             161,
+             194,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.12170918724499642,
+               0.5045268797222525,
+             ],
+             "legs": Array [
+               0.1636562993284315,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.6476160306483507,
+               0.8829273341223598,
+             ],
+           },
+           "id": 222,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.09207490613684059,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             212,
+             159,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.972142501892522,
+               0.5145345717296004,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.37469727639108896,
+             ],
+           },
+           "id": 223,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.07965682337991895,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.010291836205869914,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             171,
+             176,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.6428805419337005,
+               0.18005888122133912,
+             ],
+             "legs": Array [
+               0.032721737781539556,
+               0.5324097526818514,
+             ],
+             "shade": Array [
+               0.6242767372727394,
+               0.7567479001544416,
+             ],
+           },
+           "id": 224,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.013003502087667585,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.07138897277414799,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             190,
+             180,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.37929933665320276,
+               0.21529162512160838,
+             ],
+             "legs": Array [
+               0.27306122542358935,
+               0.7286613265331835,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.8064792235381901,
+             ],
+           },
+           "id": 225,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.12473443820141257,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.09358243787661195,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             173,
+             203,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.5099222660437226,
+               0.1383817049767822,
+             ],
+             "legs": Array [
+               0.27306122542358935,
+               0.39819493104703724,
+             ],
+             "shade": Array [
+               0.016582480305805808,
+               0.7131300430372357,
              ],
+           },
+           "id": 226,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.13260340181179345,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.04361785711720586,
                },
              ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             193,
+             180,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.2916330901999027,
+               0.5134868054650724,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.20539353399537505,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.650075298268348,
+             ],
+           },
+           "id": 227,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.12457771106623114,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             171,
+             195,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.18792986148037014,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.3062647359445691,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.8602004407439381,
+               0.13860262795351447,
+             ],
+           },
+           "id": 228,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.0620976291038096,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             206,
+             170,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.08153350657783448,
+               0.12170918724499642,
+             ],
+             "legs": Array [
+               0.9542958488874138,
+               0.04875780829228461,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.21020471617579461,
+             ],
+           },
+           "id": 229,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.08552187255583704,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.09750347638502718,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.05120457290671766,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             170,
+             212,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.0907169745955616,
+               0.7648110222071409,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.21457202691584826,
+             ],
+           },
+           "id": 230,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             174,
+             170,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.11119796920567751,
+               0.4292301880195737,
+             ],
+             "legs": Array [
+               0.09136741694994271,
+               0.13079777574166657,
+             ],
+             "shade": Array [
+               0.31165202777832746,
+               0.650075298268348,
+             ],
+           },
+           "id": 231,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.044032520391047006,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             197,
+             168,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.06562787876464427,
+               0.4517109959758818,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.24119117971509693,
+               0.08442001892253756,
+             ],
+           },
+           "id": 232,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             202,
+             164,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.3657925058156252,
+               0.48096869233995676,
+             ],
+             "legs": Array [
+               0.7875359890051186,
+               0.6087459124159067,
+             ],
+             "shade": Array [
+               0.4502500294428319,
+               0.7521478051692247,
+             ],
+           },
+           "id": 233,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.022240170957520605,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             194,
+             161,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.06562787876464427,
+               0.015277567021548762,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.6401723040733487,
+             ],
+             "shade": Array [
+               0.23613477831706406,
+               0.0011761614400893627,
+             ],
+           },
+           "id": 234,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             202,
+             176,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.11119796920567751,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.6736146545596421,
+             ],
+             "shade": Array [
+               0.5955402408726513,
+               0.26761950738728046,
+             ],
+           },
+           "id": 235,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             161,
+             197,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.10966089904308318,
+               0.2106858861632645,
+             ],
+             "legs": Array [
+               0.8861112548038363,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.7686254936642944,
+             ],
+           },
+           "id": 236,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.12672813259065152,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             175,
+             188,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.11119796920567751,
+               0.5945494808722287,
+             ],
+             "legs": Array [
+               0.04882866145111621,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.4964051085524261,
+               0.14918588211759926,
+             ],
+           },
+           "id": 237,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.08462721482850612,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.042538755498826505,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             197,
+             193,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.4357579493429512,
+               0.9048278306145221,
+             ],
+             "legs": Array [
+               0.033190414942801005,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.8986494904384017,
+               0.3788983194343746,
+             ],
+           },
+           "id": 238,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.016996292071416976,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             185,
+             188,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.12170918724499642,
+               0.7648110222071409,
+             ],
+             "legs": Array [
+               0.20528416343033315,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.1522284011915326,
+               0.13860262795351447,
+             ],
+           },
+           "id": 239,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.0030425190739333634,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             177,
+             170,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.6987302172183991,
+               0.4738291495945305,
+             ],
+             "legs": Array [
+               0.7111496813222765,
+               0.20528416343033315,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.650075298268348,
+             ],
+           },
+           "id": 240,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.05584967528469861,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             190,
+             177,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.3736084914207458,
+               0.2322918148897588,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.16250907485373317,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.9548127378802747,
+             ],
+           },
+           "id": 241,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.07914574999362231,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             205,
+             214,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.041226946236565726,
+               0.7065469003282487,
+             ],
+             "legs": Array [
+               0.3033800857607275,
+               0.10411071055568755,
+             ],
+             "shade": Array [
+               0.42002532733604314,
+               0.2689511015638709,
+             ],
+           },
+           "id": 242,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.050427251262590296,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             187,
+             174,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.48096869233995676,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.6087459124159067,
+               0.07640893313102425,
+             ],
+             "shade": Array [
+               0.7521478051692247,
+               0.1347323467489332,
+             ],
+           },
+           "id": 243,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             161,
+             158,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.17851312248967588,
+               0.3065178843028844,
+             ],
+             "legs": Array [
+               0.18584776181727647,
+               0.7235142913181335,
+             ],
+             "shade": Array [
+               0.10434154666028916,
+               0.8064792235381901,
+             ],
+           },
+           "id": 244,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             181,
+             165,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.30807177745737135,
+               0.15078813002444802,
+             ],
+             "legs": Array [
+               0.11655567865818739,
+               0.10411071055568755,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.2689511015638709,
+             ],
+           },
+           "id": 245,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.06007115542888642,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             211,
+             174,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.5965258525405079,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.3268562515731901,
+               0.4753607284091413,
+             ],
+             "shade": Array [
+               0.8791199564654381,
+               0.14673616201616824,
+             ],
+           },
+           "id": 246,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.00007593331858515741,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.0038073776569217447,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             204,
+             205,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.17771392441354691,
+               0.4292301880195737,
+             ],
+             "legs": Array [
+               0.6382178370840847,
+               0.13079777574166657,
+             ],
+             "shade": Array [
+               0.9369378120172769,
+               0.5424016224499791,
+             ],
+           },
+           "id": 247,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.11380193117074669,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             201,
+             175,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.870104934675619,
+             ],
+             "legs": Array [
+               0.1134222698584199,
+               0.01768964518792926,
+             ],
+             "shade": Array [
+               0.23883666557259858,
+               0.20930666290223598,
+             ],
+           },
+           "id": 248,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.10529391246847809,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.07251760784536601,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.009741436764597893,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             210,
+             198,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.23533845633268358,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.3378296137228608,
+             ],
+             "shade": Array [
+               0.9569800948072225,
+               0.5554748592339456,
+             ],
+           },
+           "id": 249,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             215,
+             184,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.3541899673361331,
+             ],
+             "legs": Array [
+               0.4619385722838342,
+               0.20528416343033315,
+             ],
+             "shade": Array [
+               0.14673616201616824,
+               0.09751412875019014,
+             ],
+           },
+           "id": 250,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.013422156125307085,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.05167175336740912,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             205,
+             203,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.08941140724346042,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.013557212976738814,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.7463533013593405,
+               0.8002595786470921,
+             ],
+           },
+           "id": 251,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.06285172015428543,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.08266775547526778,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             181,
+             159,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.16463840217329562,
+               0.0907169745955616,
+             ],
+             "legs": Array [
+               0.2038017403241247,
+               0.22892538400366902,
+             ],
+             "shade": Array [
+               0.8602004407439381,
+               0.2689511015638709,
+             ],
+           },
+           "id": 252,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.12481467344798149,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             206,
+             174,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.013297130325809134,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.015791547400876876,
+               0.10724500931799413,
+             ],
+             "shade": Array [
+               0.6242767372727394,
+               0.8829273341223598,
+             ],
+           },
+           "id": 253,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.08831916315481067,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             190,
+             159,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.2363890316337347,
+               0.3541899673361331,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.20528416343033315,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.8064792235381901,
+             ],
+           },
+           "id": 254,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             171,
+             203,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.7065469003282487,
+               0.08941140724346042,
+             ],
+             "legs": Array [
+               0.2368423379957676,
+               0.8861112548038363,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.909406910231337,
+             ],
+           },
+           "id": 255,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.12933594454079866,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.015896872924640777,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             174,
+             204,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.3435523348581046,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.3268562515731901,
+               0.1134222698584199,
+             ],
+             "shade": Array [
+               0.25651873386465013,
+               0.8986494904384017,
+             ],
+           },
+           "id": 256,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             194,
+             210,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.5099222660437226,
+               0.7648110222071409,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.3268562515731901,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.25651873386465013,
+             ],
+           },
+           "id": 257,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             193,
+             194,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.33138908142223955,
+               0.18792986148037014,
+             ],
+             "legs": Array [
+               0.07640893313102425,
+               0.24416710684075948,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.8935100373066962,
+             ],
+           },
+           "id": 258,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             211,
+             206,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.7648110222071409,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.21457202691584826,
+             ],
+           },
+           "id": 259,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             159,
+             170,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.4362150962743908,
+               0.4738291495945305,
+             ],
+             "legs": Array [
+               0.1286460286937654,
+               0.13079777574166657,
+             ],
+             "shade": Array [
+               0.11848142048344015,
+               0.14918588211759926,
+             ],
+           },
+           "id": 260,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.09602002176456154,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             199,
+             177,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.628449552776292,
+               0.10411071055568755,
+             ],
+             "shade": Array [
+               0.9569800948072225,
+               0.37469727639108896,
+             ],
+           },
+           "id": 261,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.12881588833406568,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             215,
+             193,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.3401950745098293,
+               0.9048278306145221,
+             ],
+             "legs": Array [
+               0.33080957022495566,
+               0.2027339621726423,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.3788983194343746,
+             ],
+           },
+           "id": 262,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.007020043497905136,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             184,
+             188,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.3401950745098293,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.5773432695493103,
+             ],
+           },
+           "id": 263,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.05873851647600532,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             184,
+             185,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.8965627392940223,
+               0.2545648984517902,
+             ],
+             "legs": Array [
+               0.2780925833806396,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.5186047530733049,
+               0.11790990659967066,
+             ],
+           },
+           "id": 264,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.13672981292009356,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.03328551174141467,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             185,
+             173,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.04418851020745935,
+               0.34660880360752344,
+             ],
+             "legs": Array [
+               0.5248264079354703,
+               0.18439311929047103,
+             ],
+             "shade": Array [
+               0.0011761614400893627,
+               0.7686254936642944,
+             ],
+           },
+           "id": 265,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.028910943185910587,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.13592291744425894,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.018340842882171277,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             176,
+             188,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.4738291495945305,
+               0.17851312248967588,
+             ],
+             "legs": Array [
+               0.34051557750441136,
+               0.18584776181727647,
+             ],
+             "shade": Array [
+               0.650075298268348,
+               0.16990619462914763,
+             ],
+           },
+           "id": 266,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.1352314140740782,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.06556464796885848,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             177,
+             181,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.2545648984517902,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.27306122542358935,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.032882914831861856,
+               0.21457202691584826,
+             ],
+           },
+           "id": 267,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.11750730969011784,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             173,
+             170,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.8058617603406311,
+               0.7065469003282487,
+             ],
+             "legs": Array [
+               0.7331632524728775,
+               0.07487850478850305,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.2689511015638709,
+             ],
+           },
+           "id": 268,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.00964896115474403,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.029232205767184497,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             165,
+             174,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.8058617603406311,
+               0.4292301880195737,
+             ],
+             "legs": Array [
+               0.7235142913181335,
+               0.13079777574166657,
+             ],
+             "shade": Array [
+               0.9986961587518454,
+               0.5424016224499791,
+             ],
+           },
+           "id": 269,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             165,
+             175,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.28775822405703366,
+               0.3158910243306309,
+             ],
+             "legs": Array [
+               0.07640893313102425,
+               0.1134222698584199,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.9439715618547052,
+             ],
+           },
+           "id": 270,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.12137709314003588,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.13686321708373728,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.04532207141630352,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             158,
+             210,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.33138908142223955,
+               0.7856653339974582,
+             ],
+             "legs": Array [
+               0.07640893313102425,
+               0.934175130771473,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.23613477831706406,
+             ],
+           },
+           "id": 271,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.07606664523482323,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             211,
+             202,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.4292301880195737,
+             ],
+             "legs": Array [
+               0.10411071055568755,
+               0.11655567865818739,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.6915931584406644,
+             ],
+           },
+           "id": 272,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             193,
+             168,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.6910366159491241,
+               0.6004534788616002,
+             ],
+             "legs": Array [
+               0.13079777574166657,
+               0.7111496813222765,
+             ],
+             "shade": Array [
+               0.650075298268348,
+               0.33287810974754395,
+             ],
+           },
+           "id": 273,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.015510284379124642,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.042427063072100285,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.041819166643545035,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             168,
+             190,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.2106858861632645,
+               0.4292301880195737,
+             ],
+             "legs": Array [
+               0.9741691097989678,
+               0.11655567865818739,
+             ],
+             "shade": Array [
+               0.7686254936642944,
+               0.6915931584406644,
+             ],
+           },
+           "id": 274,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.07763021547347308,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             188,
+             168,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.12170918724499642,
+               0.28275798689574005,
+             ],
+             "legs": Array [
+               0.09067649512551725,
+               0.2529528344981372,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.9548127378802747,
+             ],
+           },
+           "id": 275,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.1146076683048159,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             203,
+             214,
+           ],
+         },
+         Object {
+           "born": 4,
+           "genes": Object {
+             "fur": Array [
+               0.2363890316337347,
+               0.8555065228138119,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.1636562993284315,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.21020471617579461,
+             ],
+           },
+           "id": 276,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             171,
+             212,
+           ],
+         },
+       ],
+       "selection": true,
+       "stats": Object {
+         "diversity": 0.19198173497452786,
+         "means": Object {
+           "fur": 0.38236606427980585,
+           "legs": 0.35568013808170024,
+           "shade": 0.4670309436654984,
+         },
+         "size": 60,
+       },
+       "survivors": Array [
+         158,
+         159,
+         161,
+         164,
+         165,
+         167,
+         168,
+         169,
+         170,
+         171,
+         173,
+         174,
+         175,
+         176,
+         177,
+         180,
+         181,
+         184,
+         185,
+         186,
+         187,
+         188,
+         190,
+         193,
+         194,
+         195,
+         196,
+         197,
+         198,
+         199,
+         201,
+         202,
+         203,
+         204,
+         205,
+         206,
+         208,
+         210,
+         211,
+         212,
+         214,
+         215,
+       ],
+     },
+     Object {
+       "event": "climate",
+       "generation": 5,
+       "habitat": "drought",
+       "mutationRate": 0.2,
+       "mutations": 81,
+       "population": Array [
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.23533845633268358,
+               0.1143470114748925,
+             ],
+             "legs": Array [
+               0.3378296137228608,
+               0.7875359890051186,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.3211338854767382,
+             ],
+           },
+           "id": 277,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.06461515161208808,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             249,
+             221,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.870104934675619,
+               0.8159593227040023,
+             ],
+             "legs": Array [
+               0.09890335359610618,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.20930666290223598,
+               0.8986494904384017,
+             ],
+           },
+           "id": 278,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.08886850791051985,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.014518916262313724,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             248,
+             238,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.0907169745955616,
+             ],
+             "legs": Array [
+               0.628449552776292,
+               0.02485261624678968,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.37469727639108896,
+             ],
+           },
+           "id": 279,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.08265377720817925,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             261,
+             230,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.2615433029923588,
+               0.9048278306145221,
+             ],
+             "legs": Array [
+               0.7962578839343042,
+               0.033190414942801005,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.8986494904384017,
+             ],
+           },
+           "id": 280,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.11775603366084397,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.06759655740112067,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             225,
+             238,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.23533845633268358,
+             ],
+             "legs": Array [
+               0.6736146545596421,
+               0.20539353399537505,
+             ],
+             "shade": Array [
+               0.26761950738728046,
+               0.9470541070960462,
+             ],
+           },
+           "id": 281,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             235,
+             217,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.5402693727705628,
+               0.3030826980713755,
+             ],
+             "legs": Array [
+               0.34051557750441136,
+               0.20539353399537505,
+             ],
+             "shade": Array [
+               0.6060217787604779,
+               0.5554748592339456,
+             ],
+           },
+           "id": 282,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.0664402231760323,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.06774424173869194,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.044053519507870086,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             266,
+             217,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.3110347620304674,
+               0.2545648984517902,
+             ],
+             "legs": Array [
+               0.6382178370840847,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.5266239589173346,
+               0.2545323662552983,
+             ],
+           },
+           "id": 283,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.13332083761692048,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.015777663532644513,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.03996033933945001,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             247,
+             267,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.10966089904308318,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.9336095570307226,
+             ],
+             "shade": Array [
+               0.3788983194343746,
+               0.7686254936642944,
+             ],
+           },
+           "id": 284,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.11818976824171842,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             238,
+             236,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.12170918724499642,
+               0.14796001070179043,
+             ],
+             "legs": Array [
+               0.05842395762912929,
+               0.9429571643751115,
+             ],
+             "shade": Array [
+               0.21020471617579461,
+               0.908773327525705,
+             ],
+           },
+           "id": 285,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.038299111658707266,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.1071817659214139,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.005243510352447629,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.10229410398751498,
+               },
+             ],
+           },
+           "mutations": 4,
+           "parents": Array [
+             229,
+             236,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.10966089904308318,
+               0.6745206563547254,
+             ],
+             "legs": Array [
+               0.9037697188649326,
+               0.07487850478850305,
+             ],
+             "shade": Array [
+               0.7686254936642944,
+               0.2689511015638709,
+             ],
+           },
+           "id": 286,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.03202624397352338,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.01765846406109631,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             236,
+             268,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.4014417867176235,
+               0.37929933665320276,
+             ],
+             "legs": Array [
+               0.06315833790227765,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.3788983194343746,
+               0.8064792235381901,
+             ],
+           },
+           "id": 287,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.06124671220779419,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.13957562427036466,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             262,
+             225,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.018844465026631965,
+             ],
+             "legs": Array [
+               0.27306122542358935,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.08442001892253756,
+             ],
+           },
+           "id": 288,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.08447234379127623,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             267,
+             232,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.9048278306145221,
+             ],
+             "legs": Array [
+               0.2027339621726423,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.3788983194343746,
+               0.3788983194343746,
+             ],
+           },
+           "id": 289,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             262,
+             238,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.013297130325809134,
+               0.8058617603406311,
+             ],
+             "legs": Array [
+               0.015791547400876876,
+               0.1106889061909169,
+             ],
+             "shade": Array [
+               0.500648641148582,
+               0.2689511015638709,
+             ],
+           },
+           "id": 290,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.03581040140241385,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.12362809612415732,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             253,
+             268,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.7065469003282487,
+               0.3401950745098293,
+             ],
+             "legs": Array [
+               0.06641760721802711,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.5554748592339456,
+             ],
+           },
+           "id": 291,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.008460897570475938,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             268,
+             263,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.3401950745098293,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.33080957022495566,
+               0.5145345717296004,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.37469727639108896,
+             ],
+           },
+           "id": 292,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             262,
+             223,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.19992542499676347,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.5145345717296004,
+               0.015791547400876876,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.6242767372727394,
+             ],
+           },
+           "id": 293,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             223,
+             253,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.7974549684207887,
+               0.4357579493429512,
+             ],
+             "legs": Array [
+               0.7875359890051186,
+               0.9482006747275591,
+             ],
+             "shade": Array [
+               0.7094475555233657,
+               0.8986494904384017,
+             ],
+           },
+           "id": 294,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.11390731465071441,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             221,
+             238,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.0907169745955616,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.032882914831861856,
+             ],
+           },
+           "id": 295,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             230,
+             267,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.11119796920567751,
+               0.21529162512160838,
+             ],
+             "legs": Array [
+               0.7310569673031568,
+               0.7286613265331835,
+             ],
+             "shade": Array [
+               0.26761950738728046,
+               0.7825526814255863,
+             ],
+           },
+           "id": 296,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.05744231274351478,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.023926542112603786,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             235,
+             225,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.15078813002444802,
+               0.2545648984517902,
+             ],
+             "legs": Array [
+               0.11655567865818739,
+               0.3744629149604589,
+             ],
+             "shade": Array [
+               0.2689511015638709,
+               0.0614241005666554,
+             ],
+           },
+           "id": 297,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.10140168953686954,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.09430701539851725,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             245,
+             267,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.10966089904308318,
+             ],
+             "legs": Array [
+               0.1134222698584199,
+               0.8861112548038363,
+             ],
+             "shade": Array [
+               0.23883666557259858,
+               0.8064792235381901,
+             ],
+           },
+           "id": 298,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             248,
+             236,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.0907169745955616,
+               0.870104934675619,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.01768964518792926,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.20930666290223598,
+             ],
+           },
+           "id": 299,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             230,
+             248,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.12170918724499642,
+               0.1952787646651268,
+             ],
+             "legs": Array [
+               0.04875780829228461,
+               0.03437709434889258,
+             ],
+             "shade": Array [
+               0.21020471617579461,
+               0.4625847553182393,
+             ],
+           },
+           "id": 300,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.0840807954594493,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.062456458648666745,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.13295548555441203,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             229,
+             235,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.8299733825400472,
+             ],
+             "legs": Array [
+               0.2027339621726423,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.37469727639108896,
+             ],
+           },
+           "id": 301,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.06516236033290625,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             262,
+             230,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.15078813002444802,
+               0.4517109959758818,
+             ],
+             "legs": Array [
+               0.11655567865818739,
+               0.14136277046054602,
+             ],
+             "shade": Array [
+               0.280332734817639,
+               0.2918089499697089,
+             ],
+           },
+           "id": 302,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.011381633253768087,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.05061777025461198,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             245,
+             232,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.1481113348156214,
+             ],
+             "legs": Array [
+               0.9482006747275591,
+               0.02807936429977417,
+             ],
+             "shade": Array [
+               0.2926332428585738,
+               0.24609606019221247,
+             ],
+           },
+           "id": 303,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.03376432334072888,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.08626507657580078,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.010422673672437668,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             238,
+             221,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.7648110222071409,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.26761950738728046,
+               0.37469727639108896,
+             ],
+           },
+           "id": 304,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             235,
+             230,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.3401950745098293,
+               0.7065469003282487,
+             ],
+             "legs": Array [
+               0.20850404256023464,
+               0.603127695126459,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.2689511015638709,
+             ],
+           },
+           "id": 305,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.12230552766472103,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.1300355573464185,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             262,
+             268,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.5134868054650724,
+               0.06562787876464427,
+             ],
+             "legs": Array [
+               0.14218586463481186,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.5935910393856466,
+               0.0011761614400893627,
+             ],
+           },
+           "id": 306,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.06320766936056317,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.0564842588827014,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             227,
+             234,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.28589864119887354,
+               0.19854363240301606,
+             ],
+             "legs": Array [
+               0.3378296137228608,
+               0.3062647359445691,
+             ],
+             "shade": Array [
+               0.9569800948072225,
+               0.13860262795351447,
+             ],
+           },
+           "id": 307,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.05056018486618996,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.010613770922645928,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             249,
+             228,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.013297130325809134,
+               0.4517109959758818,
+             ],
+             "legs": Array [
+               0.24254504282027486,
+               0.9088226336799562,
+             ],
+             "shade": Array [
+               0.6242767372727394,
+               0.24119117971509693,
+             ],
+           },
+           "id": 308,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.13530003350228073,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.08093559031374753,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             253,
+             232,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.06562787876464427,
+               0.17851312248967588,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.34051557750441136,
+             ],
+             "shade": Array [
+               0.24119117971509693,
+               0.16990619462914763,
+             ],
+           },
+           "id": 309,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             232,
+             266,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.17771392441354691,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.6382178370840847,
+             ],
+             "shade": Array [
+               0.5955402408726513,
+               0.5852636502217501,
+             ],
+           },
+           "id": 310,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.04286202777177096,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             235,
+             247,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.06562787876464427,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.1134222698584199,
+             ],
+             "shade": Array [
+               0.24119117971509693,
+               0.23883666557259858,
+             ],
+           },
+           "id": 311,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             232,
+             248,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.6082527292054146,
+               0.1143470114748925,
+             ],
+             "legs": Array [
+               0.05585164130665363,
+               0.6736146545596421,
+             ],
+             "shade": Array [
+               0.9782522470597177,
+               0.26761950738728046,
+             ],
+           },
+           "id": 312,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.011650943346321585,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.05139336801134051,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.13882041881792248,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             253,
+             235,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.23533845633268358,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.3378296137228608,
+               0.3012554283440113,
+             ],
+             "shade": Array [
+               0.6359183919243514,
+               0.21457202691584826,
+             ],
+           },
+           "id": 313,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.02819420292042196,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.08044353269040586,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             249,
+             267,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.9823170289490373,
+             ],
+             "legs": Array [
+               0.11432985071092845,
+               0.10411071055568755,
+             ],
+             "shade": Array [
+               0.6242767372727394,
+               0.37469727639108896,
+             ],
+           },
+           "id": 314,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.11285514043644072,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.09853830331005158,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             253,
+             261,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.4517109959758818,
+               0.6817051995825022,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.05750360749661922,
+             ],
+             "shade": Array [
+               0.08442001892253756,
+               0.07660704055801032,
+             ],
+           },
+           "id": 315,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.08310582262463868,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.050002785958349706,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.13796498635783794,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             232,
+             230,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.17771392441354691,
+               0.8965627392940223,
+             ],
+             "legs": Array [
+               0.13079777574166657,
+               0.2780925833806396,
+             ],
+             "shade": Array [
+               0.9369378120172769,
+               0.11790990659967066,
+             ],
+           },
+           "id": 316,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             247,
+             264,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.2545648984517902,
+               0.23533845633268358,
+             ],
+             "legs": Array [
+               0.1975592225044966,
+               0.20539353399537505,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.5554748592339456,
+             ],
+           },
+           "id": 317,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             267,
+             217,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.21529162512160838,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.27047939884476363,
+               0.628449552776292,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.3841506718005985,
+             ],
+           },
+           "id": 318,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.0025818265788257124,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.00945339540950954,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             225,
+             261,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.27054439290426674,
+               0.0907169745955616,
+             ],
+             "legs": Array [
+               0.1576608511246741,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.032882914831861856,
+               0.37469727639108896,
+             ],
+           },
+           "id": 319,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.1034890137705952,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.039898371379822495,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             267,
+             230,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.34232167704962196,
+             ],
+             "legs": Array [
+               0.1975592225044966,
+               0.7875359890051186,
+             ],
+             "shade": Array [
+               0.8602004407439381,
+               0.4502500294428319,
+             ],
+           },
+           "id": 320,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.023470828766003253,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             228,
+             233,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.013297130325809134,
+               0.48096869233995676,
+             ],
+             "legs": Array [
+               0.10724500931799413,
+               0.7875359890051186,
+             ],
+             "shade": Array [
+               0.6242767372727394,
+               0.7521478051692247,
+             ],
+           },
+           "id": 321,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             253,
+             233,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.7648110222071409,
+               0.20208631030283866,
+             ],
+             "legs": Array [
+               0.3268562515731901,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.25651873386465013,
+               0.21457202691584826,
+             ],
+           },
+           "id": 322,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.05247858814895154,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             257,
+             267,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.4292301880195737,
+             ],
+             "legs": Array [
+               0.2084829987306148,
+               0.13079777574166657,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.5424016224499791,
+             ],
+           },
+           "id": 323,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.06712022827006878,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             249,
+             247,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.20773143026046456,
+               0.5134868054650724,
+             ],
+             "legs": Array [
+               0.1975592225044966,
+               0.24308725881390275,
+             ],
+             "shade": Array [
+               0.22277167617343369,
+               0.8064792235381901,
+             ],
+           },
+           "id": 324,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.04067605112679303,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.0376937248185277,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.08416904821991922,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             228,
+             227,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.18005888122133912,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.032721737781539556,
+             ],
+             "shade": Array [
+               0.42861021696589885,
+               0.6437394900247454,
+             ],
+           },
+           "id": 325,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.12686464226804675,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.019462752752006054,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             263,
+             224,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.02822641422972081,
+               0.2916330901999027,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.9281393701210618,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.8064792235381901,
+             ],
+           },
+           "id": 326,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.062490560365840796,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.12365995515137912,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             230,
+             227,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.02807936429977417,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.5955402408726513,
+               0.16563384550623594,
+             ],
+           },
+           "id": 327,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.0489381814096123,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             221,
+             267,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.4517109959758818,
+               0.5134868054650724,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.20539353399537505,
+             ],
+             "shade": Array [
+               0.24119117971509693,
+               0.650075298268348,
+             ],
+           },
+           "id": 328,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             232,
+             227,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.49929386283271016,
+             ],
+             "legs": Array [
+               0.27306122542358935,
+               0.015791547400876876,
+             ],
+             "shade": Array [
+               0.032882914831861856,
+               0.8829273341223598,
+             ],
+           },
+           "id": 329,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.09730792302638293,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             267,
+             253,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.03521400224417448,
+               0.3401950745098293,
+             ],
+             "legs": Array [
+               0.972142501892522,
+               0.18639945054426785,
+             ],
+             "shade": Array [
+               0.32348700121976437,
+               0.5554748592339456,
+             ],
+           },
+           "id": 330,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.13184137688949704,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.01633451162837446,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.051210275171324614,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             223,
+             262,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.046872543785721046,
+             ],
+             "legs": Array [
+               0.6736146545596421,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.5955402408726513,
+               0.21457202691584826,
+             ],
+           },
+           "id": 331,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.12018283534795048,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             235,
+             267,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.9048278306145221,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.8002595786470921,
+             ],
+           },
+           "id": 332,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             249,
+             251,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.4356847526784986,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.972142501892522,
+             ],
+             "shade": Array [
+               0.5773432695493103,
+               0.37469727639108896,
+             ],
+           },
+           "id": 333,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.01706948873586953,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             263,
+             223,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.4517109959758818,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.08442001892253756,
+               0.6635700666811317,
+             ],
+           },
+           "id": 334,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.08278323467820883,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             232,
+             251,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.37929933665320276,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.14918588211759926,
+             ],
+           },
+           "id": 335,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             263,
+             225,
+           ],
+         },
+         Object {
+           "born": 5,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.21529162512160838,
+             ],
+             "legs": Array [
+               0.8366126364469528,
+               0.7286613265331835,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.14918588211759926,
+             ],
+           },
+           "id": 336,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.13552986544556916,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             223,
+             225,
+           ],
+         },
+       ],
+       "selection": true,
+       "stats": Object {
+         "diversity": 0.18961640466951346,
+         "means": Object {
+           "fur": 0.3666195555448842,
+           "legs": 0.37310360659852926,
+           "shade": 0.4388273188732564,
+         },
+         "size": 60,
+       },
+       "survivors": Array [
+         217,
+         221,
+         223,
+         224,
+         225,
+         227,
+         228,
+         229,
+         230,
+         232,
+         233,
+         234,
+         235,
+         236,
+         238,
+         245,
+         247,
+         248,
+         249,
+         251,
+         253,
+         257,
+         261,
+         262,
+         263,
+         264,
+         266,
+         267,
+         268,
+       ],
+     },
+     Object {
+       "event": "steady",
+       "generation": 6,
+       "habitat": "drought",
+       "mutationRate": 0.2,
+       "mutations": 49,
+       "population": Array [
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.015791547400876876,
+               0.3012554283440113,
+             ],
+             "shade": Array [
+               0.6242767372727394,
+               0.21457202691584826,
+             ],
+           },
+           "id": 337,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             293,
+             313,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.628449552776292,
+               0.38764215396717183,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.6242767372727394,
+             ],
+           },
+           "id": 338,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.12689241776242854,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             279,
+             293,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.11119796920567751,
+               0.6082527292054146,
+             ],
+             "legs": Array [
+               0.7423424138315022,
+               0.05585164130665363,
+             ],
+             "shade": Array [
+               0.7825526814255863,
+               0.9782522470597177,
+             ],
+           },
+           "id": 339,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.013681087298318744,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             296,
+             312,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.0907169745955616,
+               0.1143470114748925,
+             ],
+             "legs": Array [
+               0.628449552776292,
+               0.05585164130665363,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.26761950738728046,
+             ],
+           },
+           "id": 340,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             279,
+             312,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.16561297100037337,
+             ],
+             "legs": Array [
+               0.05585164130665363,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.9782522470597177,
+               0.21457202691584826,
+             ],
+           },
+           "id": 341,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.0014424081332981588,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             312,
+             288,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.45275424141436815,
+               0.013297130325809134,
+             ],
+             "legs": Array [
+               0.27306122542358935,
+               0.9088226336799562,
+             ],
+             "shade": Array [
+               0.5554748592339456,
+               0.24119117971509693,
+             ],
+           },
+           "id": 342,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             335,
+             308,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.3030826980713755,
+               0.21529162512160838,
+             ],
+             "legs": Array [
+               0.23510178960859776,
+               0.7237950022891164,
+             ],
+             "shade": Array [
+               0.6060217787604779,
+               0.26761950738728046,
+             ],
+           },
+           "id": 343,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.029708255613222722,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.007261965014040471,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             282,
+             296,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.1982303969375789,
+               0.4517109959758818,
+             ],
+             "legs": Array [
+               0.7310569673031568,
+               0.8548223974462599,
+             ],
+             "shade": Array [
+               0.7825526814255863,
+               0.6635700666811317,
+             ],
+           },
+           "id": 344,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.017061228184029463,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.13493582654744388,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             296,
+             334,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.013297130325809134,
+               0.37929933665320276,
+             ],
+             "legs": Array [
+               0.24254504282027486,
+               0.27306122542358935,
+             ],
+             "shade": Array [
+               0.24119117971509693,
+               0.14918588211759926,
+             ],
+           },
+           "id": 345,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             308,
+             335,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.11119796920567751,
+             ],
+             "legs": Array [
+               0.8450826619565488,
+               0.7310569673031568,
+             ],
+             "shade": Array [
+               0.5773432695493103,
+               0.26761950738728046,
+             ],
+           },
+           "id": 346,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.1270598399359733,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             333,
+             296,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.23533845633268358,
+               0.11119796920567751,
+             ],
+             "legs": Array [
+               0.3465727319009602,
+               0.7286613265331835,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.7825526814255863,
+             ],
+           },
+           "id": 347,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.04531730355694891,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             313,
+             296,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.4517109959758818,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.14032474438659848,
+             ],
+             "shade": Array [
+               0.13396315592341124,
+               0.21457202691584826,
+             ],
+           },
+           "id": 348,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.1245331969857216,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.04954313700087369,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             334,
+             293,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.5402693727705628,
+             ],
+             "legs": Array [
+               0.015791547400876876,
+               0.34051557750441136,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.5554748592339456,
+             ],
+           },
+           "id": 349,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             293,
+             282,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.06562787876464427,
+             ],
+             "legs": Array [
+               0.972142501892522,
+               0.34051557750441136,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.16990619462914763,
+             ],
+           },
+           "id": 350,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             333,
+             309,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.013297130325809134,
+               0.4356847526784986,
+             ],
+             "legs": Array [
+               0.1106889061909169,
+               0.9759376121964305,
+             ],
+             "shade": Array [
+               0.34134565521962945,
+               0.37469727639108896,
+             ],
+           },
+           "id": 351,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.051919885911047466,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.0723945536557585,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             290,
+             333,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.33177144740708175,
+             ],
+             "legs": Array [
+               0.03224991477094591,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.26761950738728046,
+               0.6635700666811317,
+             ],
+           },
+           "id": 352,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.1199395485688001,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.023601726535707714,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             312,
+             334,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.5134868054650724,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.1975592225044966,
+               0.628449552776292,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.37469727639108896,
+             ],
+           },
+           "id": 353,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             324,
+             279,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.033552738726139064,
+               0.5134868054650724,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.16990619462914763,
+               0.8064792235381901,
+             ],
+           },
+           "id": 354,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.0320751400385052,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             309,
+             324,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.6817051995825022,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.5145345717296004,
+             ],
+             "shade": Array [
+               0.052076255716383496,
+               0.21457202691584826,
+             ],
+           },
+           "id": 355,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.12868329627439382,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             315,
+             293,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.5966017858590931,
+               0.0907169745955616,
+             ],
+             "legs": Array [
+               0.015791547400876876,
+               0.7436705847550183,
+             ],
+             "shade": Array [
+               0.6242767372727394,
+               0.29839877954684196,
+             ],
+           },
+           "id": 356,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.1152210319787264,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.07629849684424699,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             293,
+             279,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.4517109959758818,
+               0.013297130325809134,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.015791547400876876,
+             ],
+             "shade": Array [
+               0.6635700666811317,
+               0.500648641148582,
+             ],
+           },
+           "id": 357,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             334,
+             290,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.4517109959758818,
+               0.8058617603406311,
+             ],
+             "legs": Array [
+               0.20976307044737041,
+               0.015791547400876876,
+             ],
+             "shade": Array [
+               0.6635700666811317,
+               0.500648641148582,
+             ],
+           },
+           "id": 358,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.10225667699240149,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             334,
+             290,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.3030826980713755,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.20539353399537505,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.6060217787604779,
+               0.5554748592339456,
+             ],
+           },
+           "id": 359,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             282,
+             335,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.4517109959758818,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.05750360749661922,
+               0.3378296137228608,
+             ],
+             "shade": Array [
+               0.08442001892253756,
+               0.21457202691584826,
+             ],
+           },
+           "id": 360,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             315,
+             313,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.3235319623723626,
+               0.21529162512160838,
+             ],
+             "legs": Array [
+               0.9897582239937037,
+               0.7310569673031568,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.26761950738728046,
+             ],
+           },
+           "id": 361,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.055767374280840165,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             335,
+             296,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.45275424141436815,
+             ],
+             "legs": Array [
+               0.6736146545596421,
+               0.8861112548038363,
+             ],
+             "shade": Array [
+               0.9782522470597177,
+               0.8064792235381901,
+             ],
+           },
+           "id": 362,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             312,
+             298,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.3030826980713755,
+               0.0907169745955616,
+             ],
+             "legs": Array [
+               0.34051557750441136,
+               0.628449552776292,
+             ],
+             "shade": Array [
+               0.5452101733256131,
+               0.4910235947184265,
+             ],
+           },
+           "id": 363,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.010264685908332467,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.11632631832733752,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             282,
+             279,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.0907169745955616,
+               0.27054439290426674,
+             ],
+             "legs": Array [
+               0.628449552776292,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.46512432369403545,
+               0.1058391118887812,
+             ],
+           },
+           "id": 364,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.09042704730294646,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": 0.07295619705691934,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             279,
+             319,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.19992542499676347,
+               0.5402693727705628,
+             ],
+             "legs": Array [
+               0.5145345717296004,
+               0.34051557750441136,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.6060217787604779,
+             ],
+           },
+           "id": 365,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             293,
+             282,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.0907169745955616,
+               0.37929933665320276,
+             ],
+             "legs": Array [
+               0.1576608511246741,
+               0.8586046670284122,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.2020747058559209,
+             ],
+           },
+           "id": 366,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.13115355696529152,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.05288882373832167,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             319,
+             335,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.4350017455499619,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.9325905279722064,
+               0.628449552776292,
+             ],
+             "shade": Array [
+               0.14918588211759926,
+               0.8064792235381901,
+             ],
+           },
+           "id": 367,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.055702408896759155,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.0776512480340898,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             335,
+             318,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.19900942688807846,
+               0.19992542499676347,
+             ],
+             "legs": Array [
+               0.27047939884476363,
+               0.5145345717296004,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.21457202691584826,
+             ],
+           },
+           "id": 368,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.016282198233529926,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             318,
+             293,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.8058617603406311,
+               0.5134868054650724,
+             ],
+             "legs": Array [
+               0.06379080968908965,
+               0.1975592225044966,
+             ],
+             "shade": Array [
+               0.2689511015638709,
+               0.22277167617343369,
+             ],
+           },
+           "id": 369,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.04799926228821278,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             290,
+             324,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.11201546845026314,
+               0.013297130325809134,
+             ],
+             "legs": Array [
+               0.972142501892522,
+               0.20456122704781593,
+             ],
+             "shade": Array [
+               0.5773432695493103,
+               0.2689511015638709,
+             ],
+           },
+           "id": 370,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.05503991068340838,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.09387232085689903,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             333,
+             290,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.1143470114748925,
+               0.009101573033258332,
+             ],
+             "legs": Array [
+               0.05585164130665363,
+               0.9088226336799562,
+             ],
+             "shade": Array [
+               0.9569071086868643,
+               0.24119117971509693,
+             ],
+           },
+           "id": 371,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.004195557292550803,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.0213451383728534,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             312,
+             308,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.46670418285764753,
+             ],
+             "legs": Array [
+               0.1887095476873219,
+               0.10750639345496893,
+             ],
+             "shade": Array [
+               0.08442001892253756,
+               0.5860443874448538,
+             ],
+           },
+           "id": 372,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.12989760300144554,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.08435167773626745,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.07752567923627794,
+               },
+             ],
+           },
+           "mutations": 3,
+           "parents": Array [
+             288,
+             334,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.39700383206829426,
+               0.16705537913367152,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.07660704055801032,
+               0.08442001892253756,
+             ],
+           },
+           "id": 373,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": -0.054707163907587536,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             315,
+             288,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.11119796920567751,
+               0.10966089904308318,
+             ],
+             "legs": Array [
+               0.7310569673031568,
+               0.10569071734324098,
+             ],
+             "shade": Array [
+               0.26761950738728046,
+               0.946013587815687,
+             ],
+           },
+           "id": 374,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.0077315525151789195,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": 0.13953436427749694,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             296,
+             298,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.12387849539518356,
+               0.013297130325809134,
+             ],
+             "legs": Array [
+               0.1975592225044966,
+               0.1106889061909169,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.2689511015638709,
+             ],
+           },
+           "id": 375,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.033161520799621945,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             319,
+             290,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.4517109959758818,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.10750639345496893,
+               0.628449552776292,
+             ],
+             "shade": Array [
+               0.6692338414583355,
+               0.33301741507835686,
+             ],
+           },
+           "id": 376,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": 0.005663774777203799,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": -0.0416798613127321,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             334,
+             279,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.5178577119857073,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.02485261624678968,
+             ],
+             "shade": Array [
+               0.08442001892253756,
+               0.37469727639108896,
+             ],
+           },
+           "id": 377,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.06614671600982547,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             315,
+             279,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.19992542499676347,
+               0.5966017858590931,
+             ],
+             "legs": Array [
+               0.015791547400876876,
+               0.02485261624678968,
+             ],
+             "shade": Array [
+               0.21457202691584826,
+               0.37469727639108896,
+             ],
+           },
+           "id": 378,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             293,
+             279,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.2580429279897362,
+               0.3030826980713755,
+             ],
+             "legs": Array [
+               0.628449552776292,
+               0.34051557750441136,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.4318623449187725,
+             ],
+           },
+           "id": 379,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 0,
+                 "delta": 0.042751302868127825,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.12361251431517305,
+               },
+             ],
+           },
+           "mutations": 2,
+           "parents": Array [
+             318,
+             282,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.0907169745955616,
+               0.1143470114748925,
+             ],
+             "legs": Array [
+               0.02485261624678968,
+               0.6736146545596421,
+             ],
+             "shade": Array [
+               0.37469727639108896,
+               0.26761950738728046,
+             ],
+           },
+           "id": 380,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             279,
+             312,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.16705537913367152,
+               0.013297130325809134,
+             ],
+             "legs": Array [
+               0.14136277046054602,
+               0.9088226336799562,
+             ],
+             "shade": Array [
+               0.3052746536303311,
+               0.24119117971509693,
+             ],
+           },
+           "id": 381,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": -0.06942262276075781,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             333,
+             308,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.10966089904308318,
+               0.3030826980713755,
+             ],
+             "legs": Array [
+               0.1134222698584199,
+               0.34051557750441136,
+             ],
+             "shade": Array [
+               0.8064792235381901,
+               0.4848622895404696,
+             ],
+           },
+           "id": 382,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": -0.07061256969347597,
+               },
+             ],
+           },
+           "mutations": 1,
+           "parents": Array [
+             298,
+             282,
+           ],
+         },
+         Object {
+           "born": 6,
+           "genes": Object {
+             "fur": Array [
+               0.6817051995825022,
+               0.37929933665320276,
+             ],
+             "legs": Array [
+               0.05750360749661922,
+               0.9897582239937037,
+             ],
+             "shade": Array [
+               0.08442001892253756,
+               0.14918588211759926,
+             ],
+           },
+           "id": 383,
+           "inheritance": Object {
+             "fur": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+             "legs": Array [
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+             ],
+             "shade": Array [
+               Object {
+                 "copy": 0,
+                 "delta": null,
+               },
+               Object {
+                 "copy": 1,
+                 "delta": null,
+               },
+             ],
+           },
+           "mutations": 0,
+           "parents": Array [
+             315,
+             335,
+           ],
+         },
+       ],
+       "selection": true,
+       "stats": Object {
+         "diversity": 0.18536933509207704,
+         "means": Object {
+           "fur": 0.29848861451181485,
+           "legs": 0.4214018390393082,
+           "shade": 0.4216947583618396,
+         },
+         "size": 47,
+       },
+       "survivors": Array [
+         279,
+         282,
+         288,
+         290,
+         293,
+         296,
+         298,
+         308,
+         309,
+         312,
+         313,
+         315,
+         318,
+         319,
+         324,
+         333,
+         334,
+         335,
+       ],
+     },
+   ],
    "living": true,
    "mutation": 0.2,
-   "nextId": 97,
-   "rng": 4005665082,
+   "nextId": 384,
+   "rng": 2407233712,
    "seed": 2026,
    "selection": true,
    "version": 1,
  }
```

# Test source

```ts
  1655 |   const life = page.locator('.ei-life'); await expect(life).toBeFocused();
  1656 |   await expect(life).toHaveAttribute('data-life-outcome', 'pending'); await expect(life).toContainText('Unrecorded offspring are unknown, not zero.');
  1657 |   await expect(life.locator('[data-life-chance]')).toHaveCount(0); await expect(life.locator('[data-life-children]')).toHaveCount(0);
  1658 |   await page.locator('[data-life-visit="birth"]').focus(); await page.keyboard.press('Enter');
  1659 |   await expect(page.locator('.ei-stage')).toBeFocused(); await expect(page.locator('.ei-life-context')).toContainText('birth generation');
  1660 |   const messageBounds = await page.evaluate(() => ({ top: document.querySelector('.ei-life-context')!.getBoundingClientRect().top, sceneBottom: document.querySelector('.ei-stage-wrap')!.getBoundingClientRect().bottom }));
  1661 |   expect(messageBounds.top).toBeGreaterThanOrEqual(messageBounds.sceneBottom - 1);
  1662 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  1663 |   const next = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandModel.step(w.__toolData.evoLab.island); });
  1664 |   await page.getByRole('button', { name: 'Watch a generation', exact: true }).click();
  1665 |   await expect(page.locator('.ei-life-context')).toHaveCount(0);
  1666 |   await page.getByRole('button', { name: 'Reveal survivors', exact: false }).click();
  1667 |   await page.getByRole('button', { name: 'Meet the offspring', exact: false }).click();
  1668 |   await page.getByRole('button', { name: 'Finish walkthrough', exact: true }).click();
  1669 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  1670 |   const observed = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandStudy.lineage(w.__toolData.evoLab.island, 1); });
  1671 |   await expect(life).toHaveAttribute('data-life-outcome', observed.outcome);
  1672 |   await expect(life.locator('[data-life-children]')).toHaveText(observed.children.length + ' direct offspring');
  1673 |   await life.screenshot({ path: report + '/life-story-phone.png', style: '.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  1674 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  1675 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  1676 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-life', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id:v.id,nodes:v.nodes.map((n:any)=>n.target) }))))).toEqual([]);
  1677 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(next);
  1678 | });
  1679 | 
  1680 | test('life story without WebGL separates a lone survivor from the organism that died', async ({ page }) => {
  1681 |   await page.setViewportSize({ width:1440,height:1100 });
  1682 |   await page.addInitScript(() => { const get=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any; });
  1683 |   await harness.mount(page, { evoLab:{view:'livingIsland'} }, undefined, {expectCanvas:false});
  1684 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const w=m.create(seed);w.history[0].population=w.history[0].population.slice(0,2);w.history[0].stats=m.stats(w.history[0].population);w.nextId=3;const world=m.step(w);if(world.history[1].survivors.length===1)return {world,id:world.history[1].survivors[0],other:world.history[0].population.find((o:any)=>!world.history[1].survivors.includes(o.id)).id};}});
  1685 |   expect(fixture).toBeTruthy();
  1686 |   await harness.mount(page, {evoLab:{view:'livingIsland',island:fixture!.world,islandStudy:{seed:fixture!.world.seed,selectedId:fixture!.id,introDismissed:true}}}, undefined, {expectCanvas:false});
  1687 |   await page.getByRole('button',{name:'Follow this life',exact:false}).click();
  1688 |   const life=page.locator('.ei-life'); await expect(life).toHaveAttribute('data-life-outcome','no-offspring');
  1689 |   await expect(life).toContainText('Fewer than two residents survived'); await expect(life.locator('[data-life-children]')).toHaveText('0 direct offspring');
  1690 |   await page.locator('[data-life-visit="survivors"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(page.locator('.ei-life-context')).toContainText('Still here');
  1691 |   await page.getByRole('button',{name:'Back to life story',exact:true}).click();
  1692 |   await page.locator('[data-life-visit="offspring"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(0); await expect(page.locator('.ei-life-context')).toContainText('0 direct offspring');
  1693 |   await page.getByRole('button',{name:'Back to life story',exact:true}).click(); await page.locator('[data-life-visit="birth"]').click();
  1694 |   await page.getByRole('tab',{name:'Explore',exact:true}).click(); await page.selectOption('#ei-organism',String(fixture!.other));
  1695 |   await expect(page.locator('.ei-life-context')).toHaveCount(0); await page.getByRole('button',{name:'Follow this life',exact:false}).click();
  1696 |   await expect(life).toHaveAttribute('data-life-outcome','not-survived'); await expect(life).toContainText('did not survive to reproduce');
  1697 |   await page.locator('[data-life-visit="parents"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  1698 |   await page.getByRole('button',{name:'Back to life story',exact:true}).click(); await page.locator('[data-life-visit="survivors"]').click();
  1699 |   await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(page.locator('.ei-life-context')).toContainText('Absent from this survivor group');
  1700 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture!.world);
  1701 | });
  1702 | 
  1703 | test('family resemblance compares real parents and offspring and explores allele pairings without creating organisms', async ({ page }) => {
  1704 |   test.setTimeout(180_000);
  1705 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  1706 |   await page.setViewportSize({width:1440,height:1100});
  1707 |   await harness.mount(page,{evoLab:{view:'livingIsland'}});
  1708 |   const fixture=await page.evaluate(()=>{
  1709 |     const w=window as any,m=w.StemLab.evoIslandModel,world=m.step({...m.create(2026),mutation:0.2});
  1710 |     const child=world.history[1].population.find((o:any)=>o.inheritance.fur.some((e:any)=>e.delta!==null));
  1711 |     const family=w.StemLab.evoIslandStudy.lineage(world,child.parents[0]);return {world,child,family};
  1712 |   });
  1713 |   expect(fixture.family.children.length).toBeGreaterThan(1);
  1714 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.family.organism.id,introDismissed:true}}});
  1715 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene','ready');
  1716 |   const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);expect(contexts).toHaveLength(1);
  1717 |   await page.getByRole('button',{name:'Follow this life',exact:false}).click();
  1718 |   await page.selectOption('#ei-life-child',String(fixture.child.id));
  1719 |   await page.getByText('Compare this offspring with both parents',{exact:true}).click();
  1720 |   const comparison=page.locator('.ei-resemblance');await expect(comparison).toHaveAttribute('data-resemblance-child',String(fixture.child.id));
  1721 |   const family=await page.evaluate((id:number)=>{const w=window as any;return w.StemLab.evoIslandStudy.lineage(w.__toolData.evoLab.island,id);},fixture.child.id);
  1722 |   const members=[...family.parents,family.organism];
  1723 |   await expect(comparison.locator('[data-resemblance-member]')).toHaveCount(3);
  1724 |   expect(await comparison.locator('[data-resemblance-member]').evaluateAll(elements=>elements.map(e=>Number(e.getAttribute('data-resemblance-member'))))).toEqual(members.map((o:any)=>o.id));
  1725 |   await page.getByText('Try the four allele pairings',{exact:true}).click();
  1726 |   for(const trait of ['fur','shade','legs']) {
  1727 |     await page.selectOption('#ei-resemblance-trait',trait);await expect(comparison.locator('[data-pairing-value]')).toHaveCount(0);
  1728 |     const d=await page.evaluate(({id,trait})=>{const w=window as any;return w.StemLab.evoIslandStudy.resemblance(w.StemLab.evoIslandStudy.lineage(w.__toolData.evoLab.island,id),trait);},{id:fixture.child.id,trait});
  1729 |     await expect(comparison.locator('[data-resemblance-value]')).toHaveText(d.values.map((v:number)=>(v*100).toFixed(2)));
  1730 |     await expect(comparison.locator('[data-resemblance-position]')).toHaveAttribute('data-resemblance-position',d.position);
  1731 |     await expect(comparison.locator('[data-recorded-pair=true]')).toHaveCount(1);
  1732 |     await expect(comparison.locator('[data-recorded-pair=true]')).toHaveAttribute('data-allele-pair',String(d.actual));
  1733 |     for(let pair=0;pair<4;pair++) {
  1734 |       await comparison.locator('[data-allele-pair="'+pair+'"]').click();
  1735 |       await expect(comparison.locator('[data-allele-pair="'+pair+'"]')).toHaveAttribute('aria-pressed','true');
  1736 |       const p=d.pairings[pair];await expect(comparison.locator('[data-pairing-value]')).toHaveText('('+(p.alleles[0]*100).toFixed(2)+' + '+(p.alleles[1]*100).toFixed(2)+') ÷ 2 ≈ '+(p.value*100).toFixed(2));
  1737 |       await expect(comparison.locator('[data-resemblance-value="2"]')).toHaveText((d.values[2]*100).toFixed(2));
  1738 |     }
  1739 |     if(trait==='fur') await expect(comparison.locator('.ei-resemblance-record')).toContainText(d.mutationCount+' of the two inherited copies mutated');
  1740 |     expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1741 |   }
  1742 |   const nextChild=fixture.family.children.find((o:any)=>o.id!==fixture.child.id);
  1743 |   await page.selectOption('#ei-life-child',String(nextChild.id));
  1744 |   await expect(comparison).toHaveAttribute('data-resemblance-child',String(nextChild.id));
  1745 |   await expect(page.locator('#ei-resemblance-trait')).toHaveValue('legs');await expect(comparison.locator('[data-pairing-value]')).toHaveCount(0);
  1746 |   await expect(comparison.locator('[data-allele-pair][aria-pressed=true]')).toHaveCount(0);
  1747 |   await page.selectOption('#ei-life-child',String(fixture.child.id));
  1748 |   await expect(comparison.locator('[data-pairing-value]')).toHaveCount(0);
  1749 |   await page.selectOption('#ei-resemblance-trait','fur');
  1750 |   await comparison.locator('[data-allele-pair="0"]').click();
  1751 |   await page.getByRole('button',{name:'Play evolution',exact:false}).click();
  1752 |   await comparison.locator('[data-allele-pair="1"]').click();
  1753 |   await expect(page.getByRole('button',{name:'Play evolution',exact:false})).toBeVisible();
  1754 |   await page.waitForTimeout(2000);
> 1755 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
       |                                                                             ^ Error: expect(received).toEqual(expected) // deep equality
  1756 |   await page.setViewportSize({width:1440,height:2200});
  1757 |   await comparison.screenshot({path:report+'/family-resemblance-desktop.png',style:'.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  1758 |   await page.setViewportSize({width:1440,height:1100});
  1759 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  1760 |   expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-resemblance',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  1761 |   expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);
  1762 |   await page.getByRole('button',{name:'Follow this offspring',exact:true}).click();
  1763 |   await expect(page.locator('.ei-life')).toHaveAttribute('data-life-id',String(fixture.child.id));await expect(page.locator('.ei-life')).toBeFocused();
  1764 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);expect(errors).toEqual([]);
  1765 | });
  1766 | 
  1767 | test('family resemblance on a phone preserves unknown legacy provenance and supports keyboard exploration', async ({ page }) => {
  1768 |   await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  1769 |   await harness.mount(page,{evoLab:{view:'livingIsland'}});
  1770 |   const fixture=await page.evaluate(()=>{
  1771 |     const w=window as any,m=w.StemLab.evoIslandModel,world=m.step(m.create(2026));
  1772 |     world.history.forEach((f:any)=>f.population.forEach((o:any)=>delete o.inheritance));
  1773 |     if(!m.restore(world))throw new Error('Invalid legacy fixture');
  1774 |     const child=world.history[1].population[0],names:any={};child.parents.concat([child.id]).forEach((id:number)=>names[id]='WWWWWWWWWWWWWWWWWWWWWWWW');return {world,child,names};
  1775 |   });
  1776 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.parents[0],names:fixture.names,introDismissed:true}}});
  1777 |   await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  1778 |   await page.getByRole('button',{name:'Follow this life',exact:false}).click();await page.selectOption('#ei-life-child',String(fixture.child.id));
  1779 |   const summary=page.getByText('Compare this offspring with both parents',{exact:true});await summary.focus();await page.keyboard.press('Enter');
  1780 |   const comparison=page.locator('.ei-resemblance');await expect(comparison).toBeVisible();
  1781 |   await page.selectOption('#ei-resemblance-trait','shade');
  1782 |   await page.getByText('Try the four allele pairings',{exact:true}).focus();await page.keyboard.press('Enter');
  1783 |   await expect(comparison.locator('[data-recorded-pair=true]')).toHaveCount(0);await expect(comparison.locator('.ei-resemblance-record')).toHaveCount(0);
  1784 |   await expect(comparison).toContainText('which one occurred and whether mutations happened are unknown');
  1785 |   await comparison.locator('[data-allele-pair="3"]').focus();await page.keyboard.press('Space');await expect(comparison.locator('[data-pairing-value]')).toHaveAttribute('data-pairing-value','3');
  1786 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  1787 |   const bottoms=await comparison.locator('.ei-meter').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().bottom));expect(Math.max(...bottoms)-Math.min(...bottoms)).toBeLessThan(1);
  1788 |   await comparison.screenshot({path:report+'/family-resemblance-phone.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  1789 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  1790 |   expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-resemblance',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  1791 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1792 | });
  1793 | 
  1794 | test('family resemblance without WebGL explains a zero-valued offspring beyond both parents without mutation', async ({ page }) => {
  1795 |   await page.setViewportSize({width:1440,height:1100});
  1796 |   await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  1797 |   await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  1798 |   const fixture=await page.evaluate(()=>{
  1799 |     const m=(window as any).StemLab.evoIslandModel;
  1800 |     for(let seed=1;seed<100;seed++) {
  1801 |       const w=m.create(seed);w.history[0].population=w.history[0].population.slice(0,2).map((o:any)=>({...o,genes:{shade:[0,1],fur:[0,1],legs:[0,1]}}));w.history[0].stats=m.stats(w.history[0].population);w.nextId=3;w.mutation=0;w.selection=false;
  1802 |       const world=m.step(w),child=world.history[1].population.find((o:any)=>m.value(o,'fur')===0);
  1803 |       if(child){if(!m.restore(world))throw new Error('Invalid zero-value fixture');return {world,child};}
  1804 |     }
  1805 |   });expect(fixture).toBeTruthy();
  1806 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture!.world,islandStudy:{seed:fixture!.world.seed,selectedId:fixture!.child.parents[0],introDismissed:true}}},undefined,{expectCanvas:false});
  1807 |   await page.getByRole('button',{name:'Follow this life',exact:false}).click();await page.selectOption('#ei-life-child',String(fixture!.child.id));
  1808 |   await page.getByText('Compare this offspring with both parents',{exact:true}).click();
  1809 |   const comparison=page.locator('.ei-resemblance');await expect(comparison.locator('[data-resemblance-value]')).toHaveText(['50.00','50.00','0.00']);
  1810 |   await expect(comparison.locator('[data-resemblance-position]')).toHaveAttribute('data-resemblance-position','below');
  1811 |   await page.getByText('Try the four allele pairings',{exact:true}).click();
  1812 |   await expect(comparison.locator('[data-allele-pair] strong')).toHaveText(['0.00','50.00','50.00','100.00']);
  1813 |   await expect(comparison).toContainText('Neither inherited copy mutated for this trait');
  1814 |   await expect(comparison.locator('[data-recorded-pair=true]')).toHaveAttribute('data-allele-pair','0');
  1815 |   await comparison.locator('[data-allele-pair="3"]').click();
  1816 |   await expect(comparison.locator('[data-pairing-value]')).toHaveText('(100.00 + 100.00) ÷ 2 ≈ 100.00');
  1817 |   await expect(comparison.locator('[data-resemblance-value="2"]')).toHaveText('0.00');
  1818 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture!.world);
  1819 | });
  1820 | 
```