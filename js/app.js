const TYPE_MASTER = {"1":"ノーマル","2":"ほのお","3":"みず","4":"でんき","5":"くさ","6":"こおり","7":"かくとう","8":"どく","9":"じめん","10":"ひこう","11":"エスパー","12":"むし","13":"いわ","14":"ゴースト","15":"ドラゴン","16":"あく","17":"はがね","18":"フェアリー"};
const SPECIALTY_MASTER = {"1":"きのみ","2":"食材","3":"スキル"};

const state={
  pokemon:[],
  recipes:[],
  ingredients:new Map(),
  party:Array(5).fill(null),
  partyMembers:[],
  recipe:null,
  candidateFood:null,
  candidateCount:null,
  category:"curry",
  partyTypes:new Set(),
  candidateTypes:new Set()
};

const $=id=>document.getElementById(id);
const ingName=id=>state.ingredients.get(Number(id))?.name??`食材${id}`;

function optionsFor(p,slot){
  const A=p?.ingredients?.A;
  const B=p?.ingredients?.B;
  const C=p?.ingredients?.C;

  if(!A)return [];

  if(slot===0)return [{key:"A",data:A}];

  if(slot===1)
    return [
      {key:"A",data:A},
      ...(B?[{key:"B",data:B}]:[])
    ];

  return [
    {key:"A",data:A},
    ...(B?[{key:"B",data:B}]:[]),
    ...(C?[{key:"C",data:C}]:[])
  ];
}

function countFor(opt,slot){
  if(!opt?.data?.counts)return null;

  return opt.data.counts[
    slot===0 ? "lv1" :
    slot===1 ? "lv30" :
    "lv60"
  ] ?? null;
}

function fillPokemonSelect(sel,currentId=""){
  sel.innerHTML='<option value="">＋ ポケモンを選択</option>';

  state.pokemon
    .filter(p=>!state.partyTypes.size || state.partyTypes.has(String(p.type)))
    .forEach(p=>{
      const o=document.createElement("option");
      o.value=p.id;
      o.textContent=`${p.id} ${p.name}`;
      sel.appendChild(o);
    });

  if(
    currentId &&
    [...sel.options].some(o=>o.value===currentId)
  ){
    sel.value=currentId;
  }
}

function refreshPartySelects(){
  document
    .querySelectorAll(".member select")
    .forEach(sel=>fillPokemonSelect(sel,sel.value));
}

function buildTypeButtons(container,set,onchange){
  container.innerHTML="";

  Object.entries(TYPE_MASTER)
    .sort((a,b)=>Number(a[0])-Number(b[0]))
    .forEach(([id,name])=>{
      const b=document.createElement("button");

      b.type="button";
      b.className="type-button";
      b.textContent=name;

      b.onclick=()=>{
        if(set.has(id)){
          set.delete(id);
          b.classList.remove("active");
        }else{
          set.add(id);
          b.classList.add("active");
        }

        onchange();
      };

      container.appendChild(b);
    });
}

function makeMember(i){
  const box=document.createElement("div");
  box.className="member";

  const title=document.createElement("div");
  title.className="member-title";
  title.textContent=`枠 ${i+1}`;

  const sel=document.createElement("select");
  fillPokemonSelect(sel);

  const foods=document.createElement("div");
  foods.className="foods";

  const member={
    pokemon:null,
    choice:[0,0,0],
    box,
    sel,
    foods
  };

  sel.onchange=()=>{
    member.pokemon=
      state.pokemon.find(p=>p.id===sel.value) || null;

    member.choice=[0,0,0];

    state.party[i]=member.pokemon ? member : null;

    renderFoods(member);
    renderRecipes();
  };

  box.append(title,sel,foods);
  renderFoods(member);

  return member;
}

function renderFoods(member){
  member.foods.innerHTML="";

  [0,1,2].forEach(slot=>{
    const opts=optionsFor(member.pokemon,slot);

    const btn=document.createElement("button");
    btn.className="food";

    if(!opts.length){
      btn.classList.add("disabled");
      btn.disabled=true;

      btn.innerHTML=`
        <div class="slot">食材枠${slot+1}</div>
        <div class="name">—</div>
      `;
    }else{
      member.choice[slot]%=opts.length;

      const opt=opts[member.choice[slot]];
      const count=countFor(opt,slot);

      btn.innerHTML=`
        <div class="slot">食材枠${slot+1} / ${opt.key}</div>
        <div class="name">${ingName(opt.data.id)}</div>
        <div class="count">
          ${count==null ? "個数未登録" : `×${count}`}
        </div>
      `;

      if(opts.length>1){
        btn.onclick=()=>{
          member.choice[slot]=
            (member.choice[slot]+1)%opts.length;

          renderFoods(member);
          renderRecipes();
        };
      }
    }

    member.foods.appendChild(btn);
  });
}

function partyIngredientIds(){
  const ids=new Set();

  state.party
    .filter(Boolean)
    .forEach(m=>{
      [0,1,2].forEach(slot=>{
        const opts=optionsFor(m.pokemon,slot);

        if(opts.length){
          const opt=
            opts[m.choice[slot]%opts.length];

          ids.add(Number(opt.data.id));
        }
      });
    });

  return ids;
}

function renderRecipes(){
  const have=partyIngredientIds();

  $("recipes").innerHTML="";
  state.recipe=null;

  $("resultSection").classList.add("hidden");
  $("candidateSection").classList.add("hidden");

  if(!state.party.some(Boolean)){
    $("recipes").innerHTML=
      '<div class="muted">まずポケモンを1匹以上選択してください。</div>';
    return;
  }

  const list=state.recipes
    .filter(r=>r.category===state.category)
    .map(r=>({
      ...r,
      hits:r.ingredients.filter(
        x=>have.has(Number(x.id))
      ).length
    }))
    .filter(r=>r.hits>0)
    .sort(
      (a,b)=>
        b.hits-a.hits ||
        a.ingredients.length-b.ingredients.length
    );

  list.forEach(r=>{
    const d=document.createElement("div");
    d.className="card";

    d.innerHTML=`
      <strong>${r.name}</strong>
      <div class="muted">
        ${r.hits}/${r.ingredients.length}種類に対応
        / 鍋 ${r.pot??"-"}
      </div>
    `;

    const iw=document.createElement("div");

    iw.style.cssText=
      "display:flex;flex-wrap:wrap;gap:6px;margin-top:8px";

    r.ingredients.forEach(x=>{
      const b=document.createElement("button");

      b.type="button";
      b.textContent=
        `${ingName(x.id)} ×${x.count}`;

      b.onclick=(ev)=>{
        ev.stopPropagation();

        state.recipe=r;

        renderCandidates(
          Number(x.id),
          x.count
        );
      };

      iw.appendChild(b);
    });

    d.appendChild(iw);

    d.onclick=()=>{
      state.recipe=r;
      renderMissing();
    };

    $("recipes").appendChild(d);
  });

  if(!list.length){
    $("recipes").innerHTML=
      '<div class="muted">該当する料理候補はありません。</div>';
  }
}

function renderMissing(){
  const have=partyIngredientIds();

  const miss=
    state.recipe.ingredients.filter(
      x=>!have.has(Number(x.id))
    );

  $("resultSection").classList.remove("hidden");
  $("candidateSection").classList.add("hidden");

  $("missing").innerHTML="";

  const box=document.createElement("div");
  box.className="card";

  const title=document.createElement("strong");
  title.textContent=state.recipe.name;

  box.appendChild(title);

  if(!miss.length){
    const p=document.createElement("div");

    p.textContent=
      "必要食材の種類はすべてカバーしています。";

    box.appendChild(p);
  }else{
    const p=document.createElement("div");

    p.className="muted";
    p.textContent=
      "不足食材をタップすると候補を表示します。";

    box.appendChild(p);

    const wrap=document.createElement("div");

    wrap.style.cssText=
      "display:flex;flex-wrap:wrap;gap:8px;margin-top:10px";

    miss.forEach(x=>{
      const b=document.createElement("button");

      b.textContent=
        `${ingName(x.id)} ×${x.count}`;

      b.onclick=()=>{
        renderCandidates(
          Number(x.id),
          x.count
        );
      };

      wrap.appendChild(b);
    });

    box.appendChild(wrap);
  }

  $("missing").appendChild(box);
}

function candidatePriority(p,foodId){
  if(
    p.ingredients?.A &&
    Number(p.ingredients.A.id)===foodId
  ) return 0;

  if(
    p.ingredients?.B &&
    Number(p.ingredients.B.id)===foodId
  ) return 1;

  if(
    p.ingredients?.C &&
    Number(p.ingredients.C.id)===foodId
  ) return 2;

  return 9;
}

function dexParts(id){
  const m=String(id).match(/^(\d+)(.*)$/);

  return m
    ? [Number(m[1]),m[2]||""]
    : [Number.MAX_SAFE_INTEGER,String(id)];
}

function renderCandidates(foodId,requiredCount){
  state.candidateFood=foodId;
  state.candidateCount=requiredCount;

  $("candidateSection").classList.remove("hidden");

  $("candidateTitle").textContent=
    `${ingName(foodId)} ×${requiredCount} を拾えるポケモン`;

  $("candidates").innerHTML="";

  let list=state.pokemon.filter(p=>
    Object.values(p.ingredients||{})
      .some(
        x=>x && Number(x.id)===foodId
      )
  );

  if(state.candidateTypes.size){
    list=list.filter(
      p=>state.candidateTypes.has(String(p.type))
    );
  }

  const mode=$("candidateSort").value;

  if(mode==="ingredient"){
    list.sort(
      (a,b)=>
        candidatePriority(a,foodId)-
        candidatePriority(b,foodId) ||
        dexParts(a.id)[0]-
        dexParts(b.id)[0] ||
        dexParts(a.id)[1].localeCompare(
          dexParts(b.id)[1]
        )
    );
  }else{
    list.sort(
      (a,b)=>
        dexParts(a.id)[0]-
        dexParts(b.id)[0] ||
        dexParts(a.id)[1].localeCompare(
          dexParts(b.id)[1]
        )
    );
  }

  list.forEach(p=>{
    const hits=[];

    [
      ["A",p.ingredients?.A,["lv1","lv30","lv60"]],
      ["B",p.ingredients?.B,["lv30","lv60"]],
      ["C",p.ingredients?.C,["lv60"]]
    ].forEach(([key,data,levels])=>{
      if(
        data &&
        Number(data.id)===foodId
      ){
        const nums=levels.map(
          lv=>data.counts?.[lv]??null
        );

        const shown=nums
          .map(v=>v==null ? "-" : v)
          .join("/");

        const valid=nums.filter(
          v=>typeof v==="number"
        );

        const total=
          valid.length===nums.length
            ? valid.reduce((a,b)=>a+b,0)
            : null;

        hits.push(
          `${key}: ${shown}` +
          `${total==null ? "" : ` total ${total}`}`
        );
      }
    });

    const d=document.createElement("div");
    d.className="card";

    d.innerHTML=`
      <strong>${p.id} ${p.name}</strong>

      <div class="muted">
        得意:
        ${SPECIALTY_MASTER[String(p.specialty)]??p.specialty}
        /
        タイプ:
        ${TYPE_MASTER[String(p.type)]??p.type}
      </div>

      <div>${hits.join(" ・ ")}</div>
    `;

    $("candidates").appendChild(d);
  });

  if(!list.length){
    $("candidates").innerHTML=
      '<div class="muted">この食材を登録しているポケモンはいません。</div>';
  }

  $("candidateSection").scrollIntoView({
    behavior:"smooth",
    block:"start"
  });
}

async function init(){
  try{
    const [pRes,rRes]=await Promise.all([
      fetch("./data/pokemon_260827.json"),
      fetch("./data/recipes_260827.json")
    ]);

    if(!pRes.ok){
      throw new Error(
        `pokemon JSON: HTTP ${pRes.status}`
      );
    }

    if(!rRes.ok){
      throw new Error(
        `recipes JSON: HTTP ${rRes.status}`
      );
    }

    const pData=await pRes.json();
    const rData=await rRes.json();

    state.pokemon=pData.pokemon;
    state.recipes=rData.recipes;

    state.ingredients=
      new Map(
        rData.ingredients.map(
          x=>[Number(x.id),x]
        )
      );

    const area=$("party");

    for(let i=0;i<5;i++){
      const m=makeMember(i);

      state.partyMembers.push(m);
      area.appendChild(m.box);
    }

    document
      .querySelectorAll(".category-button")
      .forEach(btn=>{
        btn.onclick=()=>{
          document
            .querySelectorAll(".category-button")
            .forEach(
              x=>x.classList.remove("active")
            );

          btn.classList.add("active");

          state.category=
            btn.dataset.category;

          renderRecipes();
        };
      });

    buildTypeButtons(
      $("partyTypeGrid"),
      state.partyTypes,
      refreshPartySelects
    );

    buildTypeButtons(
      $("candidateTypeGrid"),
      state.candidateTypes,
      ()=>{
        if(state.candidateFood!=null){
          renderCandidates(
            state.candidateFood,
            state.candidateCount
          );
        }
      }
    );

    $("candidateSort").onchange=()=>{
      if(state.candidateFood!=null){
        renderCandidates(
          state.candidateFood,
          state.candidateCount
        );
      }
    };

    $("partyReset").onclick=()=>{
      state.party=Array(5).fill(null);

      state.recipe=null;
      state.candidateFood=null;
      state.candidateCount=null;

      state.partyMembers.forEach(m=>{
        m.pokemon=null;
        m.choice=[0,0,0];
        m.sel.value="";
        renderFoods(m);
      });

      $("resultSection").classList.add("hidden");
      $("candidateSection").classList.add("hidden");

      renderRecipes();
    };

    renderRecipes();

    $("status").textContent=
      `GitHub版：ポケモン ${state.pokemon.length}件 / 料理 ${state.recipes.length}件`;

  }catch(e){
    $("status").textContent=
      `データ読込エラー：${e.message}`;

    console.error(e);
  }
}

init();
