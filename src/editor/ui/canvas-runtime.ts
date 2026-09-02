export const CANVAS_RUNTIME = `<script>(()=>{
  const post=(type,payload={})=>parent.postMessage({source:"weflo-canvas",type,...payload},location.origin);
  document.addEventListener("click",event=>{
    if(document.body.dataset.wfMode!=="edit")return;
    const section=event.target.closest("[data-wf-section-id]");
    if(!section)return;
    event.preventDefault();
    event.stopPropagation();
    post("canvas:select",{sectionId:section.dataset.wfSectionId});
  },true);
})();</script>`;

