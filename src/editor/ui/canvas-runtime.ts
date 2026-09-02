export const CANVAS_RUNTIME = `<style>.wf-canvas-toolbar{position:absolute;z-index:9999;display:flex;gap:2px;padding:3px;border-radius:7px;background:#141310;color:#fff;transform:translateY(-100%)}.wf-canvas-toolbar button{border:0;padding:6px 8px;background:transparent;color:inherit;font:600 11px/1 sans-serif;cursor:pointer}[data-wf-section-id]{position:relative}[data-wf-section-id][draggable="true"]{cursor:grab}[data-wf-edit-key][contenteditable="true"]{outline:2px solid #315efb;outline-offset:3px}</style><script>(()=>{
  const post=(type,payload={})=>parent.postMessage({source:"weflo-canvas",type,...payload},location.origin);
  let dragging=null;
  const toolbar=(section)=>{document.querySelector("[data-canvas-toolbar]")?.remove();const bar=document.createElement("div");bar.className="wf-canvas-toolbar";bar.dataset.canvasToolbar="";bar.innerHTML='<button data-canvas-action="moveUp">↑</button><button data-canvas-action="moveDown">↓</button><button data-canvas-action="duplicate">Dupliquer</button><button data-canvas-action="hide">Masquer</button><button data-canvas-action="remove">Supprimer</button>';bar.addEventListener("click",e=>{const action=e.target.closest("[data-canvas-action]")?.dataset.canvasAction;if(action)post("canvas:action",{sectionId:section.dataset.wfSectionId,action})});section.prepend(bar)};
  document.addEventListener("click",event=>{
    if(document.body.dataset.wfMode!=="edit")return;
    const section=event.target.closest("[data-wf-section-id]");
    if(!section)return;
    event.preventDefault();
    event.stopPropagation();
    post("canvas:select",{sectionId:section.dataset.wfSectionId});
    toolbar(section);
  },true);
  document.querySelectorAll("[data-wf-section-id]").forEach(section=>{section.draggable=true;section.addEventListener("dragstart",()=>{dragging=section.dataset.wfSectionId});section.addEventListener("dragover",event=>event.preventDefault());section.addEventListener("drop",event=>{event.preventDefault();if(!dragging)return;const siblings=[...section.parentElement.querySelectorAll(":scope > [data-wf-section-id]")];post("canvas:move",{sectionId:dragging,toIndex:siblings.indexOf(section)});dragging=null})});
  document.addEventListener("dblclick",event=>{if(document.body.dataset.wfMode!=="edit")return;const editable=event.target.closest("[data-wf-edit-key]");if(!editable)return;editable.setAttribute("contenteditable","true");editable.focus()});
  document.addEventListener("submit",event=>{if(document.body.dataset.wfMode==="edit")event.preventDefault()},true);
  document.addEventListener("focusout",event=>{const editable=event.target.closest?.("[data-wf-edit-key][contenteditable=\"true\"]");if(!editable)return;editable.removeAttribute("contenteditable");const section=editable.closest("[data-wf-section-id]");post("canvas:inline-edit",{sectionId:section.dataset.wfSectionId,key:editable.dataset.wfEditKey,value:editable.textContent||""})},true);
})();</script>`;
