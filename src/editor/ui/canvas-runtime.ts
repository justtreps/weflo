import { pointerDropPosition } from "./drag-sections";

export function keyboardMoveDirection(key: string, altKey: boolean, ownsFocus: boolean): -1 | 1 | null {
  if (!altKey || !ownsFocus) return null;
  if (key === "ArrowUp") return -1;
  if (key === "ArrowDown") return 1;
  return null;
}

export const CANVAS_RUNTIME = `<style>
.wf-canvas-toolbar{position:absolute;z-index:9999;display:flex;gap:2px;padding:3px;border-radius:7px;background:#141310;color:#fff;transform:translateY(-100%)}
.wf-canvas-toolbar button{border:0;padding:6px 8px;background:transparent;color:inherit;font:600 11px/1 sans-serif;cursor:pointer}
[data-wf-section-id],[data-wf-block-id]{position:relative}
[data-wf-section-id][draggable="true"],[data-wf-block-id][draggable="true"]{cursor:grab}
[data-wf-dragging="true"]{opacity:.55}
[data-wf-drop-position]::before,[data-wf-drop-position]::after{content:"";position:absolute;z-index:10000;left:12px;right:12px;height:4px;border-radius:999px;background:#176dff;box-shadow:0 0 0 2px #fff,0 2px 8px #0005;pointer-events:none}
[data-wf-drop-position="before"]::before{top:0;transform:translateY(-50%)}
[data-wf-drop-position="after"]::after{bottom:0;transform:translateY(50%)}
[data-wf-block-id][data-wf-drop-position]::before,[data-wf-block-id][data-wf-drop-position]::after{left:0;right:0}
[data-wf-edit-key][contenteditable="true"]{outline:2px solid #315efb;outline-offset:3px}
</style><script>(()=>{
  const post=(type,payload={})=>parent.postMessage({source:"weflo-canvas",type,...payload},location.origin);
  const sections=()=>[...document.querySelectorAll("[data-wf-section-id]")];
  const blocksIn=(section)=>[...section.querySelectorAll("[data-wf-block-id]")].filter(block=>block.closest("[data-wf-section-id]")===section);
  const offerBlock=(target)=>{const block=target?.closest?.("[data-wf-block-id]");const section=block?.closest?.("[data-wf-section-id]");return block&&section?.dataset.wfSectionType==="quantity-offer"?{block,section}:null};
  const pointerDropPosition=${pointerDropPosition.toString()};
  const keyboardMoveDirection=${keyboardMoveDirection.toString()};
  const positionAt=(event,target)=>pointerDropPosition(event.clientY,target.getBoundingClientRect());
  let draggingSection=null;
  let draggingBlock=null;
  const clearRails=()=>document.querySelectorAll("[data-wf-drop-position]").forEach(target=>target.removeAttribute("data-wf-drop-position"));
  const clearDrag=()=>{clearRails();document.querySelectorAll("[data-wf-dragging]").forEach(target=>target.removeAttribute("data-wf-dragging"));draggingSection=null;draggingBlock=null};
  const showRail=(target,position)=>{clearRails();target.dataset.wfDropPosition=position};
  const moveBlockBy=(section,block,direction)=>{const blocks=blocksIn(section);const index=blocks.indexOf(block);if(index<0)return;const toIndex=direction<0?index-1:index+2;if(toIndex<0||toIndex>blocks.length)return;post("canvas:block-move",{sectionId:section.dataset.wfSectionId,blockId:block.dataset.wfBlockId,toIndex})};
  const toolbar=(section,imageKey,block)=>{
    document.querySelector("[data-canvas-toolbar]")?.remove();
    const bar=document.createElement("div");bar.className="wf-canvas-toolbar";bar.dataset.canvasToolbar="";
    if(block)bar.dataset.canvasBlockId=block.dataset.wfBlockId;if(imageKey)bar.dataset.canvasImageKey=imageKey;
    const blockActions=block?'<button type="button" data-canvas-block-direction="-1" title="Monter le palier" aria-label="Monter le palier">↑</button><button type="button" data-canvas-block-direction="1" title="Descendre le palier" aria-label="Descendre le palier">↓</button>':'';
    bar.innerHTML=blockActions+(imageKey?'<button type="button" data-canvas-action="editImage">✦ Modifier avec l’IA</button>':'')+'<button type="button" data-canvas-action="moveUp" title="Monter la section" aria-label="Monter la section">↑</button><button type="button" data-canvas-action="moveDown" title="Descendre la section" aria-label="Descendre la section">↓</button><button type="button" data-canvas-action="duplicate">Dupliquer</button><button type="button" data-canvas-action="hide">Masquer</button><button type="button" data-canvas-action="remove">Supprimer</button>';
    section.prepend(bar)
  };
  document.addEventListener("click",event=>{
    if(document.body.dataset.wfMode!=="edit")return;
    const bar=event.target.closest("[data-canvas-toolbar]");
    if(bar){event.preventDefault();event.stopPropagation();const section=bar.closest("[data-wf-section-id]");if(!section)return;const direction=Number(event.target.closest("[data-canvas-block-direction]")?.dataset.canvasBlockDirection);const block=blocksIn(section).find(item=>item.dataset.wfBlockId===bar.dataset.canvasBlockId);if(block&&direction)moveBlockBy(section,block,direction);const action=event.target.closest("[data-canvas-action]")?.dataset.canvasAction;if(action==="editImage"&&bar.dataset.canvasImageKey)post("canvas:image-edit",{sectionId:section.dataset.wfSectionId,key:bar.dataset.canvasImageKey});else if(action)post("canvas:action",{sectionId:section.dataset.wfSectionId,action});return}
    const section=event.target.closest("[data-wf-section-id]");
    if(!section)return;
    event.preventDefault();event.stopPropagation();
    const found=offerBlock(event.target);const block=found?.section===section?found.block:null;
    post("canvas:select",{sectionId:section.dataset.wfSectionId,...(block?{blockId:block.dataset.wfBlockId}:{})});
    toolbar(section,event.target.closest("[data-wf-media-key]")?.dataset.wfMediaKey,block);
  },true);
  sections().forEach(section=>{
    section.draggable=true;
    if(section.tabIndex<0)section.tabIndex=0;
    section.setAttribute("aria-keyshortcuts","Alt+ArrowUp Alt+ArrowDown");
    if(!section.getAttribute("aria-label"))section.setAttribute("aria-label","Déplacer la section "+(section.dataset.wfSectionType||""));
    blocksIn(section).forEach(block=>{if(section.dataset.wfSectionType!=="quantity-offer")return;block.draggable=true;if(block.tabIndex<0)block.tabIndex=0;block.setAttribute("aria-keyshortcuts","Alt+ArrowUp Alt+ArrowDown");if(!block.getAttribute("aria-label"))block.setAttribute("aria-label",("Déplacer le palier "+(block.textContent?.trim()||"")).trim())});
  });
  document.addEventListener("keydown",event=>{
    const found=offerBlock(event.target);
    if(found){const direction=keyboardMoveDirection(event.key,event.altKey,event.target===found.block);if(!direction)return;event.preventDefault();event.stopPropagation();moveBlockBy(found.section,found.block,direction);return}
    const section=event.target.closest?.("[data-wf-section-id]");
    const direction=keyboardMoveDirection(event.key,event.altKey,event.target===section);
    if(!section||!direction)return;
    event.preventDefault();event.stopPropagation();post("canvas:action",{sectionId:section.dataset.wfSectionId,action:direction<0?"moveUp":"moveDown"});
  });
  document.addEventListener("dragstart",event=>{
    const found=offerBlock(event.target);
    if(found){if(event.target.closest("input,button,select,textarea,a,[contenteditable=true]")){event.preventDefault();return}draggingBlock={sectionId:found.section.dataset.wfSectionId,blockId:found.block.dataset.wfBlockId};draggingSection=null;found.block.dataset.wfDragging="true";if(event.dataTransfer){event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain","block:"+draggingBlock.sectionId+":"+draggingBlock.blockId)}return}
    const section=event.target.closest?.("[data-wf-section-id]");
    if(!section||event.target.closest("[data-canvas-toolbar],input,button,select,textarea,a,[contenteditable=true]")){event.preventDefault();return}
    draggingSection=section.dataset.wfSectionId;draggingBlock=null;section.dataset.wfDragging="true";if(event.dataTransfer){event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain","section:"+draggingSection)}
  });
  document.addEventListener("dragover",event=>{
    if(draggingBlock){const found=offerBlock(event.target);if(!found||found.section.dataset.wfSectionId!==draggingBlock.sectionId){clearRails();return}event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect="move";showRail(found.block,positionAt(event,found.block));return}
    if(draggingSection){const section=event.target.closest?.("[data-wf-section-id]");if(!section)return;event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect="move";showRail(section,positionAt(event,section))}
  });
  document.addEventListener("drop",event=>{
    try{
      if(draggingBlock){const found=offerBlock(event.target);if(!found||found.section.dataset.wfSectionId!==draggingBlock.sectionId)return;event.preventDefault();const targets=blocksIn(found.section);const targetIndex=targets.indexOf(found.block);if(targetIndex<0)return;const after=positionAt(event,found.block)==="after";post("canvas:block-move",{sectionId:draggingBlock.sectionId,blockId:draggingBlock.blockId,toIndex:targetIndex+(after?1:0)});return}
      if(draggingSection){const section=event.target.closest?.("[data-wf-section-id]");if(!section)return;event.preventDefault();const siblings=[...section.parentElement.querySelectorAll(":scope > [data-wf-section-id]")];const targetIndex=siblings.indexOf(section);if(targetIndex<0)return;const after=positionAt(event,section)==="after";post("canvas:move",{sectionId:draggingSection,toIndex:targetIndex+(after?1:0)})}
    }finally{clearDrag()}
  });
  document.addEventListener("dragend",clearDrag);
  document.addEventListener("dblclick",event=>{if(document.body.dataset.wfMode!=="edit")return;const editable=event.target.closest("[data-wf-edit-key]");if(!editable)return;editable.setAttribute("contenteditable","true");editable.focus()});
  document.addEventListener("submit",event=>{if(document.body.dataset.wfMode==="edit")event.preventDefault()},true);
  document.addEventListener("focusout",event=>{const editable=event.target.closest?.("[data-wf-edit-key][contenteditable=\\"true\\"]");if(!editable)return;editable.removeAttribute("contenteditable");const section=editable.closest("[data-wf-section-id]");post("canvas:inline-edit",{sectionId:section.dataset.wfSectionId,key:editable.dataset.wfEditKey,value:editable.textContent||""})},true);
})();</script>`;
