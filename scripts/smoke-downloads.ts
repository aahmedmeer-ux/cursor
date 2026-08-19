import JSZip from "jszip";

async function makeTpl() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`
  );
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0"?><p:presentation xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst></p:presentation>`
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>`
  );
  zip.file(
    "ppt/slides/slide1.xml",
    `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Old</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`
  );
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

async function main() {
  const tpl = await makeTpl();
  const form = new FormData();
  form.append(
    "file",
    new Blob([tpl], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }),
    "deck.pptx"
  );
  form.append("kind", "template");
  const parsed = await fetch("http://127.0.0.1:3000/api/parse-guide", {
    method: "POST",
    body: form,
  }).then((r) => r.json());
  console.log("templateId", parsed.guide?.templateId, "hasBase64", !!parsed.guide?.originalBase64);

  const presentation = {
    title: "Research Presentation: Demo Download",
    subtitle: "Sub",
    authorsPlaceholder: "Author",
    slides: [{ id: "s1", title: "Filled Title", bullets: ["One", "Two"], kind: "title" }],
    metadata: {
      generatedAt: new Date().toISOString(),
      topic: "Demo",
      surveyTitle: "S",
      templateId: parsed.guide.templateId,
      rewrittenFromScratch: true as const,
    },
  };

  const pptxRes = await fetch("http://127.0.0.1:3000/api/export-pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presentation, templateId: parsed.guide.templateId }),
  });
  const pptxBuf = Buffer.from(await pptxRes.arrayBuffer());
  console.log("pptx", pptxRes.status, pptxBuf.length, pptxBuf.slice(0, 2).toString());

  const proposal = {
    title: "Research Proposal: Download Fix",
    authorsPlaceholder: "Author",
    abstract: "Abstract",
    sections: [{ id: "s1", heading: "Intro", level: 1 as const, content: "Hello world paragraph." }],
    references: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      topic: "Demo",
      surveyTitle: "S",
      rewrittenFromScratch: true as const,
    },
  };
  const propRes = await fetch("http://127.0.0.1:3000/api/export-proposal-docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposal }),
  });
  const propBuf = Buffer.from(await propRes.arrayBuffer());
  console.log("proposal", propRes.status, propBuf.length, propBuf.slice(0, 2).toString());

  // also without templateId should still download a generated deck
  const fallback = await fetch("http://127.0.0.1:3000/api/export-pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presentation }),
  });
  console.log("pptx fallback", fallback.status, (await fallback.arrayBuffer()).byteLength);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
