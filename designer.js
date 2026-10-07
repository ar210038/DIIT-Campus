// CAMPUS DATA — IDs mirror the live Campus Explorer exactly.
const campusGroups = [
  { id: "floor6", name: "6th Floor", rooms: [["floor6-lobby","Lobby"],["floor6-principal","Principal Room"],["floor6-meeting","Meeting Room"],["floor6-accounts","Accounts"],["floor6-documents","Documents"],["floor6-waiting","Waiting Room"],["floor6-promotion","Promotion Team Room"],["floor6-bba-faculty-1","BBA Faculty 1"],["floor6-bba-faculty-2","BBA Faculty 2"],["floor6-601","601"],["floor6-602","602"],["floor6-603","603"],["floor6-604","604"],["floor6-605","605"],["floor6-606","606"],["floor6-607","607"],["floor6-608","608"],["floor6-609","609"],["floor6-boys-washroom","Boys Washroom"],["floor6-girls-washroom","Girls Washroom"],["floor6-faculty-washroom","Faculty Washroom"],["floor6-emergency-stairs","Emergency Exit Stairs"],["floor6-cafeteria","Cafeteria"]] },
  { id: "floor7", name: "7th Floor", rooms: [["floor7-cse-faculty","CSE Faculty Room 1"],["floor7-cse-faculty-2","CSE Faculty Room 2"],["floor7-lobby","Lobby"],["floor7-lab-714","Lab Room 714"],["floor7-lab-715","Lab Room 715"],["floor7-digital-lab-713","Digital Lab Room 713"],["floor7-mba-career","MBA Career Room"],["floor7-library","Library"],["floor7-701","701"],["floor7-702","702"],["floor7-704","704"],["floor7-rnd","R&D Room"],["floor7-706","706"],["floor7-thm-lab","THM Lab"],["floor7-711","711"],["floor7-mba-faculty","MBA Faculty Room"],["floor7-thm-faculty","THM Faculty Room"],["floor7-carrom","Carrom Place"],["floor7-womens-prayer","Women's Prayer Room"],["floor7-stationery","Stationery"],["floor7-it-room","IT Room"],["floor7-female-washroom","Female Washroom"],["floor7-male-washroom","Male Washroom"],["floor7-faculty-washroom","Faculty Washroom"],["floor7-emergency-stairways","Emergency Stairways"]] },
  { id: "rooftop", name: "Rooftop", rooms: [["rooftop-main","Rooftop"]] },
  { id: "auditorium", name: "71 Milonayoton Auditorium", rooms: [["auditorium-71-milonayoton","71 Milonayoton Auditorium"]] }
];
const CANVAS = { width: 1000, height: 2200 };
const STORAGE_KEY = "campusLayoutDesignerState";
const roomInfo = new Map(campusGroups.flatMap(group => group.rooms.map(([id,name]) => [id,{id,name,floor:group.id}])));
const deepCopy = value => JSON.parse(JSON.stringify(value));
const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
const esc = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function makeDefaultState() {
  const locations = [];
  const groupPositions = { floor7: {x:20,y:330,columns:5,width:180,height:76,gapX:195,gapY:88}, floor6: {x:35,y:1115,columns:4,width:205,height:70,gapX:235,gapY:80} };
  for (const group of campusGroups) {
    if (group.id === "floor7" || group.id === "floor6") {
      const p = groupPositions[group.id];
      group.rooms.forEach(([id,name],index) => {
        const row = Math.floor(index / p.columns), col = index % p.columns;
        locations.push({id,name,floor:group.id,x:p.x+col*p.gapX,y:p.y+row*p.gapY,width:p.width,height:p.height,layer:5});
      });
    }
  }
  locations.push({id:"rooftop-main",name:"Rooftop",floor:"rooftop",x:250,y:92,width:500,height:100,layer:5});
  locations.push({id:"auditorium-71-milonayoton",name:"71 Milonayoton Auditorium",floor:"auditorium",x:180,y:1900,width:640,height:150,layer:5});
  return {
    canvas: CANVAS,
    locations,
    corridors:[
      {id:"corridor-1",name:"7th Floor Corridor",x:45,y:870,width:910,height:44,layer:1},
      {id:"corridor-2",name:"6th Floor Corridor",x:30,y:1650,width:940,height:44,layer:1}
    ],
    areas:[],
    labels:[
      {id:"label-rooftop",name:"ROOFTOP",x:70,y:55,width:300,height:32,layer:8},
      {id:"label-floor7",name:"7TH FLOOR",x:70,y:275,width:300,height:32,layer:8},
      {id:"label-floor6",name:"6TH FLOOR",x:70,y:1060,width:300,height:32,layer:8},
      {id:"label-auditorium",name:"71 MILONAYOTON AUDITORIUM",x:70,y:1845,width:550,height:32,layer:8}
    ],
    grid:{size:20,snap:true,visible:true}
  };
}

let state = makeDefaultState();
let selected = new Set();
let undoStack = [], redoStack = [];
let zoom = 1;
let dragState = null;
let fieldSnapshot = null;
let toastTimer = 0;

const el = id => document.getElementById(id);
const svg = el("canvasSvg"), world = el("worldLayer");
const entityArrays = { room: "locations", corridor: "corridors", area: "areas", label: "labels" };

function allEntities() { return [...state.corridors,...state.areas,...state.locations,...state.labels]; }
function getEntity(id) { return allEntities().find(item => item.id === id); }
function entityType(item) {
  if (roomInfo.has(item.id)) return "room";
  if (item.id.startsWith("corridor-")) return "corridor";
  if (item.id.startsWith("area-")) return "area";
  return "label";
}
function groupLabel(floor) { return campusGroups.find(group => group.id === floor)?.name || floor; }

function renderElementList() {
  el("locationTotal").textContent=`${roomInfo.size} rooms`;
  el("elementList").innerHTML = campusGroups.map(group => {
    const rows = group.rooms.map(([id,name]) => `<button type="button" class="element-item ${group.id}" data-select="${id}" title="${esc(id)}"><i class="element-swatch"></i><span class="element-label">${esc(name)}</span></button>`).join("");
    return `<section class="element-group"><div class="element-group-head"><span>${esc(group.name)}</span><span>${group.rooms.length} places</span></div>${rows}</section>`;
  }).join("");
}

function entityClass(item) {
  const type = entityType(item);
  return type === "room" ? `room-${item.floor}` : type === "label" ? "label-entity" : type;
}
function entityMarkup(item) {
  const type = entityType(item);
  const classes = ["entity",entityClass(item),selected.has(item.id)?"selected":"",selected.size>1&&selected.has(item.id)?"multi-selected":""].filter(Boolean).join(" ");
  const room = type === "room";
  const label = type === "label";
  const title = esc(item.name);
  const textY = label ? 25 : room ? item.height*.53 : item.height*.55;
  const textX = label ? 0 : item.width/2;
  const idLabel = room ? `<text class="entity-id" x="${item.width/2}" y="${Math.min(item.height-10,item.height*.76)}">${esc(item.id)}</text>` : "";
  const dataId = room ? `data-location-id="${esc(item.id)}"` : "";
  const entityTypeAttr = room ? "room" : type;
  const bodyMarkup = label ? `<rect class="entity-body label-hitbox" x="-4" y="-3" width="${Math.max(item.width,title.length*13)}" height="${item.height}" rx="4"/>` : `<rect class="entity-body" x="0" y="0" width="${item.width}" height="${item.height}" rx="${type==="corridor"?8:10}"/>`;
  const handles = selected.has(item.id) ? renderHandles(item) : "";
  return `<g class="${classes}" data-entity-id="${esc(item.id)}" data-editor-type="${entityTypeAttr}" ${dataId} transform="translate(${item.x} ${item.y})" style="z-index:${item.layer}">${bodyMarkup}<text class="entity-title" x="${textX}" y="${textY}">${title}</text>${idLabel}${handles}</g>`;
}
function renderHandles(item) {
  const x0=0,y0=0,w=item.width,h=item.height,m=7;
  return `<g class="resize-handles">${[["tl",x0,y0],["tm",w/2,y0],["tr",w,y0],["ml",x0,h/2],["mr",w,h/2],["bl",x0,h],["bm",w/2,h],["br",w,h]].map(([name,x,y])=>`<rect class="resize-handle" data-handle="${name}" x="${x-m/2}" y="${y-m/2}" width="${m}" height="${m}" rx="1.5"/>`).join("")}</g>`;
}
function renderCanvas() {
  const ordered = allEntities().sort((a,b)=>a.layer-b.layer || a.id.localeCompare(b.id));
  world.innerHTML = ordered.map(entityMarkup).join("");
  el("gridSurface").style.display = state.grid.visible ? "" : "none";
  el("editorGrid").setAttribute("width",state.grid.size);
  el("editorGrid").setAttribute("height",state.grid.size);
  el("editorGrid").querySelector("path").setAttribute("d",`M ${state.grid.size} 0 L 0 0 0 ${state.grid.size}`);
  el("snapToggle").checked = state.grid.snap;
  el("gridToggle").checked = state.grid.visible;
  el("gridSize").value = String(state.grid.size);
  svg.style.width = `${zoom*100}%`;
  updateSelectionUI();
}

function updateSelectionUI() {
  const ids = [...selected].filter(id => !!getEntity(id));
  selected = new Set(ids);
  document.querySelectorAll(".element-item").forEach(button=>button.classList.toggle("active",selected.has(button.dataset.select)));
  const one = ids.length===1 ? getEntity(ids[0]) : null;
  el("selectionBadge").textContent = ids.length===0 ? "None" : ids.length===1 ? entityType(one) : `${ids.length} selected`;
  el("emptyProperties").hidden = ids.length>0;
  el("propertyForm").hidden = ids.length!==1;
  el("multiTools").hidden = ids.length<2;
  el("singleTools").hidden = ids.length!==1;
  if (one) fillProperties(one);
  if (ids.length>1) el("multiCount").textContent=`${ids.length} elements selected`;
  document.querySelectorAll('[data-align^="distribute"]').forEach(button=>button.disabled=ids.length<3);
  const status = ids.length===0 ? "Selected: none" : ids.length===1 ? `Selected: ${one.name}` : `Selected: ${ids.length} elements`;
  el("selectedStatus").textContent=status;
  if(one) el("coordinateStatus").textContent=`X: ${one.x}　Y: ${one.y}　W: ${one.width}　H: ${one.height}`;
  else el("coordinateStatus").textContent="X: —　Y: —　W: —　H: —";
  el("zoomStatus").textContent=`Zoom: ${Math.round(zoom*100)}%`;
  el("zoomLabel").textContent=`${Math.round(zoom*100)}%`;
  el("gridStatus").textContent=`Grid: ${state.grid.size}`;
  el("roomProtection").hidden = !one || entityType(one)!=="room";
  el("deleteButton").disabled = one && entityType(one)==="room";
  el("duplicateButton").disabled = one && entityType(one)==="room";
}

function fillProperties(item) {
  const type=entityType(item), room=type==="room";
  el("nameFieldWrap").firstChild.textContent = room ? "Name" : type==="label" ? "Label" : "Name";
  el("idFieldWrap").hidden = !room;
  el("propName").value=item.name;
  el("propId").value=room?item.id:"";
  ["X","Y","Width","Height","Layer"].forEach(key=>{
    const input=el(`prop${key}`); const value=item[key.toLowerCase()];
    if(document.activeElement!==input)input.value=value;
  });
}

function cloneState() { return deepCopy(state); }
function pushHistory(snapshot=cloneState()) {
  undoStack.push(snapshot); if(undoStack.length>60)undoStack.shift(); redoStack=[]; updateHistoryButtons();
}
function updateHistoryButtons(){el("undoButton").disabled=undoStack.length===0;el("redoButton").disabled=redoStack.length===0;}
function undo(){if(!undoStack.length)return;redoStack.push(cloneState());state=undoStack.pop();selected.clear();renderCanvas();updateHistoryButtons();markUnsaved();}
function redo(){if(!redoStack.length)return;undoStack.push(cloneState());state=redoStack.pop();selected.clear();renderCanvas();updateHistoryButtons();markUnsaved();}
function markUnsaved(){el("saveStatus").textContent="Unsaved changes";}
function showToast(message){const toast=el("toast");toast.textContent=message;toast.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("visible"),2100);}
function snap(value){return state.grid.snap?Math.round(value/state.grid.size)*state.grid.size:Math.round(value);}
function saveDraft(show=true){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));el("saveStatus").textContent="Draft saved";if(show)showToast("Layout saved.");}catch(error){el("saveStatus").textContent="Save failed";showToast("Could not save this layout in local storage.");}}
function migrateSavedDraft(input){
  const migrated=deepCopy(input);
  if(!migrated||!Array.isArray(migrated.locations))return migrated;
  const occupied=[...migrated.locations,...(migrated.corridors||[]),...(migrated.areas||[]),...(migrated.labels||[])];
  const grid=Math.max(10,Number(migrated.grid?.size)||20),width=180,height=76;
  const findSpot=()=>{
    const ys=[];for(let y=770;y<=1020;y+=grid)ys.push(y);for(let y=330;y<770;y+=grid)ys.push(y);for(let y=1020;y+height<=CANVAS.height;y+=grid)ys.push(y);
    for(const y of ys)for(let x=20;x+width<=CANVAS.width-20;x+=grid){
      if(occupied.every(item=>x+width<=item.x||item.x+item.width<=x||y+height<=item.y||item.y+item.height<=y))return {x,y};
    }
    return null;
  };
  for(const [id,info] of roomInfo){
    if(migrated.locations.some(item=>item?.id===id))continue;
    const spot=findSpot();
    const index=migrated.locations.filter(item=>item.floor==="floor7").length;
    const fallback={x:20+(index%5)*195,y:330+Math.floor(index/5)*88};
    const item={...info,...(spot||fallback),width,height,layer:5};
    migrated.locations.push(item);occupied.push(item);
  }
  return migrated;
}
function loadDraft(show=true){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw){if(show)showToast("No saved draft yet.");return false;}const loaded=validateLayout(migrateSavedDraft(JSON.parse(raw)));state=loaded;selected.clear();undoStack=[];redoStack=[];renderCanvas();updateHistoryButtons();el("saveStatus").textContent="Draft loaded";if(show)showToast("Layout draft loaded.");return true;}catch(error){showToast(`Draft could not be loaded: ${error.message}`);return false;}}

function screenPoint(event){const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;return point.matrixTransform(svg.getScreenCTM().inverse());}
function getTargetEntity(target){const group=target.closest("[data-entity-id]");return group?getEntity(group.dataset.entityId):null;}
function selectEntity(item,shift){
  if(shift){if(selected.has(item.id))selected.delete(item.id);else selected.add(item.id);}
  else if(!selected.has(item.id)||selected.size>1){selected.clear();selected.add(item.id);}
  renderCanvas();
}
function beginPointer(event){
  if(event.button!==0)return;
  const item=getTargetEntity(event.target);if(!item){if(!event.shiftKey){selected.clear();renderCanvas();}return;}
  const isHandle=event.target.closest(".resize-handle");
  if(isHandle&&!selected.has(item.id)){selected.clear();selected.add(item.id);renderCanvas();}
  else if(!isHandle)selectEntity(item,event.shiftKey);
  if(event.shiftKey&&!selected.has(item.id))return;
  if(isHandle&&entityType(item)==="room"){} // Rooms may be resized; only deletion is protected.
  pushHistory();
  const point=screenPoint(event);
  const moving=selected.has(item.id)&&selected.size>1?[...selected].map(id=>({id,item:getEntity(id),x:getEntity(id).x,y:getEntity(id).y})): [{id:item.id,item,x:item.x,y:item.y}];
  dragState={pointerId:event.pointerId,itemId:item.id,handle:isHandle?.dataset.handle||null,startX:point.x,startY:point.y,moving,startGeom:{x:item.x,y:item.y,width:item.width,height:item.height},moved:false};
  svg.setPointerCapture(event.pointerId);event.preventDefault();
}
function handlePointerMove(event){
  if(!dragState||event.pointerId!==dragState.pointerId)return;
  const point=screenPoint(event),dx=point.x-dragState.startX,dy=point.y-dragState.startY;
  if(Math.abs(dx)+Math.abs(dy)>.15)dragState.moved=true;
  if(dragState.handle){
    const item=getEntity(dragState.itemId),start=dragState.startGeom,h=dragState.handle;
    let x=start.x,y=start.y,w=start.width,hgt=start.height;
    const left=h.includes("l"),right=h.includes("r"),top=h.includes("t"),bottom=h.includes("b");
    if(left){x=snap(start.x+dx);w=start.width-(x-start.x);}if(right)w=snap(start.width+dx);
    if(top){y=snap(start.y+dy);hgt=start.height-(y-start.y);}if(bottom)hgt=snap(start.height+dy);
    if(w<30){if(left)x=start.x+start.width-30;w=30;}if(hgt<24){if(top)y=start.y+start.height-24;hgt=24;}
    Object.assign(item,{x:Math.round(x),y:Math.round(y),width:Math.round(w),height:Math.round(hgt)});
    syncEntityNode(item);
  }else{
    const ddx=snap(dx),ddy=snap(dy);
    for(const moving of dragState.moving){const item=getEntity(moving.id);if(!item)continue;item.x=Math.round(moving.x+ddx);item.y=Math.round(moving.y+ddy);syncEntityNode(item);}
  }
  updateSelectionUI();
}
function endPointer(event){if(dragState&&event.pointerId===dragState.pointerId){dragState=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);markUnsaved();}}
function syncEntityNode(item){
  const node=world.querySelector(`[data-entity-id="${CSS.escape(item.id)}"]`);if(!node)return;
  const type=entityType(item),label=type==="label";
  node.setAttribute("transform",`translate(${item.x} ${item.y})`);
  const rect=node.querySelector(".entity-body");if(rect){rect.setAttribute("width",label?Math.max(item.width,item.name.length*13):item.width);rect.setAttribute("height",item.height);}
  const title=node.querySelector(".entity-title");if(title){title.textContent=item.name;title.setAttribute("x",label?0:item.width/2);title.setAttribute("y",label?25:type==="room"?item.height*.53:item.height*.55);}
  const idText=node.querySelector(".entity-id");if(idText){idText.setAttribute("x",item.width/2);idText.setAttribute("y",Math.min(item.height-10,item.height*.76));}
  const handles=node.querySelectorAll(".resize-handle");const coords={tl:[0,0],tm:[item.width/2,0],tr:[item.width,0],ml:[0,item.height/2],mr:[item.width,item.height/2],bl:[0,item.height],bm:[item.width/2,item.height],br:[item.width,item.height]},m=7;
  handles.forEach(handle=>{const [x,y]=coords[handle.dataset.handle];handle.setAttribute("x",x-m/2);handle.setAttribute("y",y-m/2);});
}

function nextId(type){const prefix=type==="corridor"?"corridor-":"area-";let n=1;while(getEntity(`${prefix}${n}`))n++;return `${prefix}${n}`;}
function addEntity(type){pushHistory();let item;
  if(type==="corridor"){const id=nextId(type),number=id.split("-")[1];item={id,name:`Corridor ${number}`,x:80,y:960,width:840,height:44,layer:1};state.corridors.push(item);}
  else {const id=nextId(type),number=id.split("-")[1];item={id,name:`Area ${number}`,x:150,y:960,width:260,height:110,layer:3};state.areas.push(item);}
  selected.clear();selected.add(item.id);renderCanvas();markUnsaved();}
function deleteEntity(id){const item=getEntity(id);if(!item||entityType(item)==="room")return;pushHistory();const type=entityType(item);state[entityArrays[type]]=state[entityArrays[type]].filter(entry=>entry.id!==id);selected.delete(id);renderCanvas();markUnsaved();}
function duplicateEntity(id){const item=getEntity(id);if(!item||entityType(item)==="room"||entityType(item)==="label")return;pushHistory();const type=entityType(item),copy={...deepCopy(item),id:nextId(type),name:`${item.name} copy`,x:item.x+state.grid.size,y:item.y+state.grid.size,layer:item.layer+1};state[entityArrays[type]].push(copy);selected.clear();selected.add(copy.id);renderCanvas();markUnsaved();}

function applyProperty(input){const id=[...selected][0],item=id&&getEntity(id);if(!item)return;const key=input.dataset.property;
  if(key==="name"){const value=input.value.trim();if(!value)return;item.name=value;}
  else if(key==="x"||key==="y"){const value=Number(input.value);if(Number.isFinite(value))item[key]=Math.round(value);}
  else if(key==="width"||key==="height"){const value=Number(input.value);if(Number.isFinite(value))item[key]=Math.max(key==="width"?30:24,Math.round(value));}
  else if(key==="layer"){const value=Number(input.value);if(Number.isFinite(value))item.layer=Math.round(value);}
  renderCanvas();markUnsaved();}

function alterLayer(direction){const ids=[...selected];if(!ids.length)return;pushHistory();const items=ids.map(getEntity).filter(Boolean),max=Math.max(...allEntities().map(item=>item.layer)),min=Math.min(...allEntities().map(item=>item.layer));items.forEach(item=>{if(direction==="front")item.layer=max+1;else if(direction==="back")item.layer=min-1;else item.layer+=direction==="forward"?1:-1;});renderCanvas();markUnsaved();}
function alignSelection(mode){const items=[...selected].map(getEntity).filter(Boolean);if(items.length<2)return;pushHistory();
  const minX=Math.min(...items.map(i=>i.x)),maxRight=Math.max(...items.map(i=>i.x+i.width)),minY=Math.min(...items.map(i=>i.y)),maxBottom=Math.max(...items.map(i=>i.y+i.height));
  if(mode==="left")items.forEach(i=>i.x=minX);if(mode==="right")items.forEach(i=>i.x=maxRight-i.width);if(mode==="top")items.forEach(i=>i.y=minY);if(mode==="bottom")items.forEach(i=>i.y=maxBottom-i.height);
  if(mode==="centerX")items.forEach(i=>i.x=Math.round((minX+maxRight-i.width)/2));if(mode==="centerY")items.forEach(i=>i.y=Math.round((minY+maxBottom-i.height)/2));
  if(mode==="distributeX"||mode==="distributeY"){const horizontal=mode==="distributeX",sorted=[...items].sort((a,b)=>(horizontal?a.x:a.y)-(horizontal?b.x:b.y));if(sorted.length>2){const start=horizontal?sorted[0].x:sorted[0].y,end=horizontal?sorted.at(-1).x+sorted.at(-1).width:sorted.at(-1).y+sorted.at(-1).height,totalSize=sorted.reduce((s,i)=>s+(horizontal?i.width:i.height),0),gap=(end-start-totalSize)/(sorted.length-1);let cursor=start;sorted.forEach(i=>{if(horizontal)i.x=Math.round(cursor);else i.y=Math.round(cursor);cursor+=(horizontal?i.width:i.height)+gap;});}}
  renderCanvas();markUnsaved();}

function changeZoom(next,minimum=.5){zoom=clamp(Math.round(next*100)/100,minimum,1.5);svg.style.width=`${zoom*100}%`;updateSelectionUI();}
function fitCanvas(){const v=el("canvasViewport"),availableH=v.clientHeight-30,availableW=v.clientWidth-30;changeZoom(Math.min(availableW/1000,availableH/2200),.2);v.scrollTop=0;v.scrollLeft=0;}

function exportObject(){return {canvas:CANVAS,locations:state.locations.map(deepCopy),corridors:state.corridors.map(deepCopy),areas:state.areas.map(deepCopy),labels:state.labels.map(deepCopy),grid:deepCopy(state.grid)};}
function validateLayout(input){
  if(!input||typeof input!=="object"||!input.canvas||input.canvas.width!==CANVAS.width||input.canvas.height!==CANVAS.height)throw new Error("Canvas must be 1000 × 2200.");
  const validArray=(value,key)=>{if(!Array.isArray(value))throw new Error(`${key} must be a list.`);return value;};
  const locations=validArray(input.locations,"locations"),corridors=validArray(input.corridors,"corridors"),areas=validArray(input.areas,"areas"),labels=validArray(input.labels,"labels");
  const ids=locations.map(item=>item?.id);if(ids.length!==roomInfo.size||new Set(ids).size!==roomInfo.size||[...roomInfo.keys()].some(id=>!ids.includes(id)))throw new Error(`Import must include all ${roomInfo.size} unique campus location IDs.`);
  const validateItems=(items,type)=>items.map((source,index)=>{
    if(!source||typeof source!=="object")throw new Error(`${type} item ${index+1} is invalid.`);
    const id=String(source.id||"");if(!id)throw new Error(`${type} item ${index+1} needs an ID.`);
    if(![source.x,source.y,source.width,source.height,source.layer].every(value=>Number.isFinite(Number(value))))throw new Error(`${id} has invalid coordinates or layer.`);
    if(Number(source.width)<30||Number(source.height)<24)throw new Error(`${id} is smaller than the minimum supported size.`);
    return {...source,id,name:String(source.name||id),x:Math.round(Number(source.x)),y:Math.round(Number(source.y)),width:Math.round(Number(source.width)),height:Math.round(Number(source.height)),layer:Math.round(Number(source.layer))};
  });
  const cleanLocations=validateItems(locations,"Location").map(item=>({...item,...roomInfo.get(item.id)}));
  const cleanCorridors=validateItems(corridors,"Corridor"),cleanAreas=validateItems(areas,"Area"),cleanLabels=validateItems(labels,"Label");
  const allIds=[...cleanLocations,...cleanCorridors,...cleanAreas,...cleanLabels].map(item=>item.id);if(new Set(allIds).size!==allIds.length)throw new Error("Element IDs must be unique.");
  if(cleanCorridors.some(item=>!/^corridor-\d+$/.test(item.id))||cleanAreas.some(item=>!/^area-\d+$/.test(item.id)))throw new Error("Corridor and area IDs must use corridor-N and area-N.");
  const grid=input.grid||{};if(![10,20,25,50].includes(Number(grid.size??20)))throw new Error("Grid size must be 10, 20, 25, or 50.");
  return {canvas:CANVAS,locations:cleanLocations,corridors:cleanCorridors,areas:cleanAreas,labels:cleanLabels,grid:{size:Number(grid.size??20),snap:grid.snap!==false,visible:grid.visible!==false}};
}

function downloadFile(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportJSON(){return JSON.stringify(exportObject(),null,2);}
function svgExport(){
  const entities=allEntities().sort((a,b)=>a.layer-b.layer);
  const parts=entities.map(item=>{const type=entityType(item),room=type==="room",label=type==="label",body=label?"":`<rect x="0" y="0" width="${item.width}" height="${item.height}" rx="${type==="corridor"?8:10}"/>`,cls=room?"map-location":type==="corridor"?"map-corridor":type==="area"?"map-structure":"map-label",idAttr=room?` data-location-id="${esc(item.id)}"`:"",textX=label?0:item.width/2,textY=label?25:item.height*.55;
    return `  <g class="${cls}"${idAttr} transform="translate(${item.x} ${item.y})" data-layer="${item.layer}">${body}<text x="${textX}" y="${textY}" text-anchor="${label?"start":"middle"}" dominant-baseline="middle">${esc(item.name)}</text></g>`;
  }).join("\n");
  return `<!-- Campus Explorer editable layout export. Keep every data-location-id unchanged. -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" role="img" aria-label="Campus map">\n${parts}\n</svg>\n`;
}
function codexExport(){const lines=["CAMPUS LAYOUT EXPORT","",`Canvas: ${CANVAS.width} × ${CANVAS.height}`,"","ROOMS:"];
  for(const item of [...state.locations].sort((a,b)=>a.y-b.y||a.x-b.x))lines.push(`${item.id}\nFloor: ${groupLabel(item.floor)}\nx: ${item.x}\ny: ${item.y}\nwidth: ${item.width}\nheight: ${item.height}\nlayer: ${item.layer}`);
  lines.push("CORRIDORS:");for(const item of state.corridors)lines.push(`${item.id}\nName: ${item.name}\nx: ${item.x}\ny: ${item.y}\nwidth: ${item.width}\nheight: ${item.height}\nlayer: ${item.layer}`);
  lines.push("AREAS:");for(const item of state.areas)lines.push(`${item.id}\nLabel: ${item.name}\nx: ${item.x}\ny: ${item.y}\nwidth: ${item.width}\nheight: ${item.height}\nlayer: ${item.layer}`);
  lines.push("LABELS:");for(const item of state.labels)lines.push(`${item.id}\nLabel: ${item.name}\nx: ${item.x}\ny: ${item.y}\nwidth: ${item.width}\nheight: ${item.height}\nlayer: ${item.layer}`);
  lines.push("IMPORTANT: Keep every data-location-id exactly unchanged.");return lines.join("\n\n");}
async function copyText(text,message){try{await navigator.clipboard.writeText(text);showToast(message);}catch{const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.append(area);area.select();const ok=document.execCommand("copy");area.remove();showToast(ok?message:"Clipboard is unavailable in this browser.");}}

function openModal(id){el(id).hidden=false;el(id).querySelector("button")?.focus();}
function closeModal(id){el(id).hidden=true;}
function togglePreview(value){document.body.classList.toggle("preview-mode",value);el("previewExit").hidden=!value;el("gridSurface").style.display=value||!state.grid.visible?"none":"";}

function init(){
  renderElementList();
  try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)state=validateLayout(migrateSavedDraft(JSON.parse(saved)));}catch(error){showToast(`Saved draft ignored: ${error.message}`);}
  renderCanvas();updateHistoryButtons();
  world.addEventListener("pointerdown",beginPointer);
  svg.addEventListener("pointermove",handlePointerMove);svg.addEventListener("pointerup",endPointer);svg.addEventListener("pointercancel",endPointer);
  el("elementList").addEventListener("click",event=>{const button=event.target.closest("[data-select]");if(button){selected.clear();selected.add(button.dataset.select);renderCanvas();}});
  el("propertyForm").addEventListener("focusin",()=>{fieldSnapshot=cloneState();});
  el("propertyForm").addEventListener("input",event=>{if(event.target.dataset.property)applyProperty(event.target);});
  el("propertyForm").addEventListener("change",()=>{if(fieldSnapshot){undoStack.push(fieldSnapshot);if(undoStack.length>60)undoStack.shift();redoStack=[];fieldSnapshot=null;updateHistoryButtons();}});
  document.querySelectorAll("[data-property]").forEach(input=>input.addEventListener("input",()=>{const item=getEntity([...selected][0]);if(item)syncEntityNode(item);}));
  document.querySelectorAll("[data-layer]").forEach(button=>button.addEventListener("click",()=>alterLayer(button.dataset.layer)));
  document.querySelectorAll("[data-align]").forEach(button=>button.addEventListener("click",()=>alignSelection(button.dataset.align)));
  el("addCorridor").addEventListener("click",()=>addEntity("corridor"));el("addArea").addEventListener("click",()=>addEntity("area"));
  el("deleteButton").addEventListener("click",()=>{const id=[...selected][0];if(id)deleteEntity(id);});
  el("duplicateButton").addEventListener("click",()=>{const id=[...selected][0];if(id)duplicateEntity(id);});
  el("multiFront").addEventListener("click",()=>alterLayer("front"));
  el("saveButton").addEventListener("click",()=>saveDraft(true));el("loadButton").addEventListener("click",()=>loadDraft(true));
  el("snapToggle").addEventListener("change",event=>{pushHistory();state.grid.snap=event.target.checked;markUnsaved();});
  el("gridToggle").addEventListener("change",event=>{pushHistory();state.grid.visible=event.target.checked;el("gridSurface").style.display=state.grid.visible?"":"none";markUnsaved();});
  el("gridSize").addEventListener("change",event=>{pushHistory();state.grid.size=Number(event.target.value);renderCanvas();markUnsaved();});
  el("zoomIn").addEventListener("click",()=>changeZoom(clamp(zoom+.1,.5,1.5)));el("zoomOut").addEventListener("click",()=>changeZoom(clamp(zoom-.1,.5,1.5)));el("fitButton").addEventListener("click",fitCanvas);
  el("undoButton").addEventListener("click",undo);el("redoButton").addEventListener("click",redo);
  el("exportMenuButton").addEventListener("click",()=>{const menu=el("exportMenu");menu.hidden=!menu.hidden;el("exportMenuButton").setAttribute("aria-expanded",String(!menu.hidden));});
  el("exportMenu").addEventListener("click",async event=>{const button=event.target.closest("[data-export]");if(!button)return;el("exportMenu").hidden=true;el("exportMenuButton").setAttribute("aria-expanded","false");
    if(button.dataset.export==="json")downloadFile("campus-layout.json",exportJSON(),"application/json");
    if(button.dataset.export==="svg")downloadFile("campus-layout.svg",svgExport(),"image/svg+xml");
    if(button.dataset.export==="copy")copyText(exportJSON(),"Layout JSON copied.");
    if(button.dataset.export==="codex")copyText(codexExport(),"Layout copied for Codex.");
    if(button.dataset.export==="import")openModal("importModal");
  });
  el("importFile").addEventListener("change",async event=>{const file=event.target.files[0];if(file)el("importText").value=await file.text();});
  el("applyImport").addEventListener("click",()=>{try{const next=validateLayout(JSON.parse(el("importText").value));pushHistory();state=next;selected.clear();renderCanvas();closeModal("importModal");el("importText").value="";el("importError").textContent="";markUnsaved();showToast("Layout imported.");}catch(error){el("importError").textContent=error.message||"That JSON could not be imported.";}});
  el("resetButton").addEventListener("click",()=>openModal("resetModal"));el("confirmReset").addEventListener("click",()=>{pushHistory();state=makeDefaultState();selected.clear();try{localStorage.removeItem(STORAGE_KEY);}catch{}renderCanvas();updateHistoryButtons();el("saveStatus").textContent="Starting layout restored";closeModal("resetModal");showToast("Starting layout restored.");});
  document.querySelectorAll("[data-close-reset]").forEach(button=>button.addEventListener("click",()=>closeModal("resetModal")));
  document.querySelectorAll("[data-close-import]").forEach(button=>button.addEventListener("click",()=>closeModal("importModal")));
  ["resetModal","importModal"].forEach(id=>el(id).addEventListener("click",event=>{if(event.target===el(id))closeModal(id);}));
  el("previewButton").addEventListener("click",()=>togglePreview(true));el("exitPreview").addEventListener("click",()=>togglePreview(false));
  document.addEventListener("keydown",event=>{
    const editing=["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName);
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z"){event.preventDefault();event.shiftKey?redo():undo();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y"){event.preventDefault();redo();return;}
    if(editing||!selected.size)return;
    if(event.key==="Delete"||event.key==="Backspace"){const deletable=[...selected].filter(id=>getEntity(id)&&entityType(getEntity(id))!=="room");if(deletable.length){event.preventDefault();deletable.forEach(deleteEntity);}return;}
    const deltas={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!deltas[event.key])return;
    event.preventDefault();pushHistory();const step=state.grid.snap?state.grid.size:1,mult=event.shiftKey?5:1,[dx,dy]=deltas[event.key];
    [...selected].forEach(id=>{const item=getEntity(id);if(item){item.x+=dx*step*mult;item.y+=dy*step*mult;syncEntityNode(item);}});updateSelectionUI();markUnsaved();
  });
}

init();
