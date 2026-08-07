import fs from "fs";
import JSZip from "jszip";
import { parseGuideFile, isReadablePlainText } from "../src/lib/parse-guide";
import { generateResearchProposal } from "../src/lib/generate-proposal";
import { generateResearchPresentation } from "../src/lib/generate-presentation";
import { presentationToPptxBuffer } from "../src/lib/export-pptx";
import type { MatrixRow, SurveyPaper } from "../src/lib/types";

async function makePptx() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`
  );
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldIdLst>
<p:sldId id="256" r:id="rId2"/>
<p:sldId id="257" r:id="rId3"/>
</p:sldIdLst>
</p:presentation>`
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
</Relationships>`
  );
  const slide = (title: string, body: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${title}</a:t></a:r></a:p></p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${body}</a:t></a:r></a:p></p:txBody></p:sp>
</p:spTree></p:cSld></p:sld>`;
  zip.file("ppt/slides/slide1.xml", slide("Title", "Placeholder author"));
  zip.file("ppt/slides/slide2.xml", slide("Motivation", "Placeholder bullets"));
  return zip.generateAsync({ type: "nodebuffer" });
}

async function main() {
  const garbage =
    "Identity Adobe Identity Adobe\n7♠.ÒcÍ3¡ garbage ◙éì◙>³E(\nOËË\nAbstract\nMethodology\nTimeline\nReferences\nFollow agency rules for page limits.";
  const g = await parseGuideFile(
    "guidelines.txt",
    "text/plain",
    Buffer.from(garbage, "utf8"),
    "guidelines"
  );
  console.log("structure", g.structureNotes);
  console.log("text includes Identity?", /Identity/.test(g.text));

  const paper: SurveyPaper = {
    title: "A critical Survey on drone swarm opertions",
    abstract:
      "This survey synthesizes drone swarm literature across coordination, sensing, and autonomy.",
    keywords: ["drone", "swarm", "coordination"],
    authorsPlaceholder: "Author",
    contributions: ["Taxonomy of swarm ops", "Gap map for autonomy"],
    sections: [
      {
        id: "s1",
        heading: "Introduction",
        level: 1,
        content: "Drones operate in teams. Coordination remains hard.",
        citations: [],
      },
    ],
    references: [{ id: "r1", key: "a1", text: "Smith 2020. Drone swarms." }],
    figures: [],
    tables: [],
    equations: [],
    template: "ieee",
    taxonomyStyle: "simple",
    metadata: {
      generatedAt: new Date().toISOString(),
      matrixPaperCount: 3,
      discoveredPaperCount: 0,
      humanized: false,
      topic: "A critical Survey on drone swarm opertions",
    },
  };
  const rows: MatrixRow[] = [
    {
      id: "1",
      title: "Swarm A",
      authors: "A",
      year: 2021,
      venue: "X",
      method: "RL",
      findings: "ok",
      gaps: "Limited real-world trials",
      themes: "swarm",
      keywords: "drone",
      doi: "",
      url: "",
      notes: "",
      raw: {},
    },
  ];

  const badGuide = {
    fileName: "Week09.pdf",
    kind: "template" as const,
    mimeType: "application/pdf",
    text: garbage,
    structureNotes: [
      "7♠.ÒcÍ3¡◙×",
      "Identity Adobe Identity Adobe",
      "OËË",
      "Abstract",
      "Methodology",
    ],
    byteLength: 100,
  };
  const proposal = generateResearchProposal({
    paper,
    rows,
    templateGuide: badGuide,
    guidelinesGuide: g,
    authorName: "Test",
  });
  console.log("proposal headings:", proposal.sections.map((s) => s.heading));
  console.log(
    "has garbage heading?",
    proposal.sections.some((s) => /Identity|Òc|OËË|◙/.test(s.heading))
  );

  const pptxBuf = await makePptx();
  const pptGuide = await parseGuideFile(
    "template.pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    Buffer.from(pptxBuf),
    "template"
  );
  console.log("pptx notes", pptGuide.structureNotes, "base64", !!pptGuide.originalBase64);
  const presentation = generateResearchPresentation({
    paper,
    proposal,
    templateGuide: pptGuide,
    authorName: "Test",
  });
  console.log(
    "pres slides",
    presentation.slides.map((s) => s.title)
  );
  const out = await presentationToPptxBuffer(presentation, pptGuide.originalBase64);
  console.log("cloned pptx bytes", out.byteLength);
  const z = await JSZip.loadAsync(out);
  const s1 = await z.file("ppt/slides/slide1.xml")!.async("string");
  console.log("slide1 filled?", /Research Presentation/.test(s1));
  console.log("placeholder removed?", !/Placeholder author/.test(s1));
  console.log("readable sample?", isReadablePlainText("Methodology"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
