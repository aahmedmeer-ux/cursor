import fs from "fs";
import JSZip from "jszip";
import { paperToLatexZip } from "../src/lib/export-latex";
import { presentationToPptxBuffer } from "../src/lib/export-pptx";
import { parseGuideFile } from "../src/lib/parse-guide";
import type { ResearchPresentation, SurveyPaper } from "../src/lib/types";

async function makeTemplateWithImage() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
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
<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
</p:presentation>`
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`
  );
  // Minimal 1x1 PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  zip.file("ppt/media/image1.png", png);
  zip.file(
    "ppt/slides/_rels/slide1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`
  );
  zip.file(
    "ppt/slides/slide1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="123456"/></a:solidFill></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
<p:pic>
<p:nvPicPr><p:cNvPr id="2" name="Picture"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
<p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
<p:spPr/>
</p:pic>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Old Title</a:t></a:r></a:p></p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="4" name="Body"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Old body</a:t></a:r></a:p></p:txBody></p:sp>
</p:spTree></p:cSld></p:sld>`
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

async function main() {
  const paper: SurveyPaper = {
    title: "A Survey of Demo Topic",
    abstract: "Abstract text for latex zip.",
    keywords: ["demo", "survey"],
    authorsPlaceholder: "Author",
    contributions: ["One contribution"],
    sections: [
      {
        id: "taxonomy",
        heading: "Taxonomy of the Field",
        level: 1,
        content: "Taxonomy discussion paragraph.",
        citations: [],
      },
      {
        id: "comparison",
        heading: "Comparative Analysis",
        level: 1,
        content: "Comparison discussion paragraph.",
        citations: [],
      },
    ],
    references: [{ id: "r1", key: "a1", text: "[1] Smith. Demo." }],
    figures: [
      {
        id: "fig-tax",
        title: "Taxonomy",
        caption: "Field taxonomy figure.",
        kind: "taxonomy",
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="#e8f0f4"/><text x="20" y="100" font-size="20" fill="#123">Taxonomy</text></svg>`,
      },
    ],
    tables: [
      {
        id: "tab-cmp",
        title: "Comparison",
        caption: "Comparison of methods.",
        kind: "comparison",
        headers: ["Paper", "Method", "Finding"],
        rows: [
          ["A", "RL", "Works"],
          ["B", "Filter", "Stable"],
        ],
      },
    ],
    equations: [],
    template: "ieee",
    taxonomyStyle: "simple",
    metadata: {
      generatedAt: new Date().toISOString(),
      matrixPaperCount: 2,
      discoveredPaperCount: 0,
      humanized: false,
      topic: "Demo Topic",
    },
  };

  const latexZip = await paperToLatexZip(paper);
  const lz = await JSZip.loadAsync(latexZip);
  const tex = await lz.file("main.tex")!.async("string");
  const figNames = Object.keys(lz.files).filter((n) => n.startsWith("figures/"));
  console.log("latex figures", figNames);
  console.log("has includegraphics", /includegraphics/.test(tex));
  console.log("has table*", /begin\{table\*\}/.test(tex));
  console.log("has figure*", /begin\{figure\*\}/.test(tex));

  const tpl = await makeTemplateWithImage();
  const guide = await parseGuideFile(
    "deck.pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    Buffer.from(tpl),
    "template"
  );
  const presentation: ResearchPresentation = {
    title: "Research Presentation: Demo",
    subtitle: "Subtitle",
    authorsPlaceholder: "Author",
    slides: [
      {
        id: "s1",
        title: "New Title From Research",
        bullets: ["Point one", "Point two"],
        kind: "title",
      },
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      topic: "Demo",
      surveyTitle: paper.title,
      templateFileName: guide.fileName,
      rewrittenFromScratch: true,
    },
  };
  const out = await presentationToPptxBuffer(presentation, guide.originalBase64);
  const oz = await JSZip.loadAsync(out);
  const hasMedia = !!oz.file("ppt/media/image1.png");
  const slide = await oz.file("ppt/slides/slide1.xml")!.async("string");
  const hasBg = /123456/.test(slide);
  const hasPic = /<p:pic\b/.test(slide);
  const hasNewTitle = /New Title From Research/.test(slide);
  const keptOldTitle = /Old Title/.test(slide);
  console.log({ hasMedia, hasBg, hasPic, hasNewTitle, keptOldTitle });
  fs.writeFileSync("/tmp/smoke-latex.zip", latexZip);
  fs.writeFileSync("/tmp/smoke-deck.pptx", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
