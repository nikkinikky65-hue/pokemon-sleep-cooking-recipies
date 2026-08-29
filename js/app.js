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
  candidateTypes:new Set(),
  recipeFilter:"",
  recipeSort:"energy-desc",
  potMin:0,
  potMax:Infinity
};

const $=id=>document.getElementById(id);

const ingName=id=>
  state.ingredients.get(Number(id))?.name??`食材${id}`;

const ingredientImage=id=>
  `./assets/images/ingredients/${String(id).padStart(3,"0")}.jpg`;


/* ==================================================
   ポケモン食材構成
   ================================================== */

function optionsFor(p,slot){
  const A=p?.ingredients?.A;
  const B=p?.ingredients?.B;
  const C=p?.ingredients?.C;

  if(!A)return [];

  if(slot===0){
    return [
      {key:"A",data:A}
    ];
  }

  if(slot===1){
    return [
      {key:"A",data:A},
      ...(B?[{key:"B",data:B}]:[])
    ];
  }

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


/* ==================================================
   ポケモン選択
   ================================================== */

function fillPokemonSelect(sel,currentId=""){
  sel.innerHTML=
    '<option value="">＋ ポケモンを選択</option>';

  state.pokemon
    .filter(
      p=>
        !state.partyTypes.size ||
        state.partyTypes.has(String(p.type))
    )
    .forEach(p=>{
      const option=document.createElement("option");

      option.value=p.id;
      option.textContent=`${p.id} ${p.name}`;

      sel.appendChild(option);
    });

  if(
    currentId &&
    [...sel.options].some(
      option=>option.value===currentId
    )
  ){
    sel.value=currentId;
  }
}


function refreshPartySelects(){
  state.partyMembers.forEach(member=>{
    const currentId=
      member.pokemon?.id ?? member.sel.value;

    fillPokemonSelect(
      member.sel,
      currentId
    );
  });
}


/* ==================================================
   タイプボタン
   ================================================== */

function buildTypeButtons(container,set,onchange){
  container.innerHTML="";

  Object.entries(TYPE_MASTER)
    .sort(
      (a,b)=>Number(a[0])-Number(b[0])
    )
    .forEach(([id,name])=>{
      const button=document.createElement("button");

      button.type="button";
      button.className="type-button";
      button.textContent=name;

      button.onclick=()=>{
        if(set.has(id)){
          set.delete(id);
          button.classList.remove("active");
        }else{
          set.add(id);
          button.classList.add("active");
        }

        onchange();
      };

      container.appendChild(button);
    });
}


/* ==================================================
   2. パーティ構成
   ================================================== */

function makeMember(i){
  const box=document.createElement("div");
  box.className="member";

  const title=document.createElement("div");
  title.className="member-title";

  const titleText=document.createElement("span");
  titleText.className="member-title-text";
  titleText.textContent=`枠 ${i+1}`;

  const reset=document.createElement("button");
  reset.type="button";
  reset.className="member-reset";
  reset.textContent="リセット";
  reset.title=`枠 ${i+1} をリセット`;

  title.append(titleText,reset);

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
      state.pokemon.find(
        p=>p.id===sel.value
      ) || null;

    member.choice=[0,0,0];

    state.party[i]=
      member.pokemon
        ? member
        : null;

    renderFoods(member);
    renderRecipes();
  };

  reset.onclick=()=>{
    member.pokemon=null;
    member.choice=[0,0,0];
    member.sel.value="";

    state.party[i]=null;

    state.recipe=null;
    state.candidateFood=null;
    state.candidateCount=null;

    renderFoods(member);

    $("resultSection").classList.add("hidden");
    $("candidateSection").classList.add("hidden");

    renderRecipes();
  };

  box.append(
    title,
    sel,
    foods
  );

  renderFoods(member);

  return member;
}


/* ==================================================
   食材枠
   ================================================== */

function renderFoods(member){
  member.foods.innerHTML="";

  [0,1,2].forEach(slot=>{
    const opts=
      optionsFor(
        member.pokemon,
        slot
      );

    const button=document.createElement("button");

    button.type="button";
    button.className="food";

    if(!opts.length){
      button.classList.add("disabled");
      button.disabled=true;

      button.innerHTML=`
        <div class="slot">
          食材枠${slot+1}
        </div>

        <div class="name">
          —
        </div>
      `;
    }

    else{
      member.choice[slot]%=opts.length;

      const opt=
        opts[member.choice[slot]];

      const count=
        countFor(
          opt,
          slot
        );

      button.innerHTML=`
        <div class="slot">
          食材枠${slot+1} / ${opt.key}
        </div>

        <div class="ingredient-display">

          <img
            class="ingredient-icon"
            src="${ingredientImage(opt.data.id)}"
            alt="${ingName(opt.data.id)}"
          >

          <span class="name">
            ${ingName(opt.data.id)}
          </span>

        </div>

        <div class="count">
          ${
            count==null
              ? "個数未登録"
              : `×${count}`
          }
        </div>
      `;

      if(opts.length>1){
        button.onclick=()=>{
          member.choice[slot]=
            (member.choice[slot]+1) %
            opts.length;

          renderFoods(member);
          renderRecipes();
        };
      }
    }

    member.foods.appendChild(button);
  });
}


/* ==================================================
   現在パーティの食材
   ================================================== */

function partyIngredientIds(){
  const ids=new Set();

  state.party
    .filter(Boolean)
    .forEach(member=>{
      [0,1,2].forEach(slot=>{
        const opts=
          optionsFor(
            member.pokemon,
            slot
          );

        if(!opts.length)return;

        const opt=
          opts[
            member.choice[slot] %
            opts.length
          ];

        ids.add(
          Number(opt.data.id)
        );
      });
    });

  return ids;
}


/* ==================================================
   3. 料理候補用データ
   ================================================== */

function recipeEnergy(r){
  const keys=[
    "energy",
    "recipeEnergy",
    "recipe_energy",
    "expectedEnergy",
    "expected_energy",
    "baseEnergy",
    "base_energy"
  ];

  for(const key of keys){
    const n=Number(r?.[key]);

    if(Number.isFinite(n)){
      return n;
    }
  }

  return 0;
}


function recipePot(r){
  const n=
    Number(
      r?.pot ??
      r?.potSize ??
      r?.pot_size
    );

  return Number.isFinite(n)
    ? n
    : 0;
}


function categoryRecipes(){
  return state.recipes.filter(
    r=>r.category===state.category
  );
}


/* ==================================================
   3. 料理候補UI
   ================================================== */

function updateRecipeControls(){
  const list=categoryRecipes();

  const select=$("recipeSelect");
  const minInput=$("potMin");
  const maxInput=$("potMax");

  if(
    !select ||
    !minInput ||
    !maxInput
  ){
    return;
  }

  /* 料理プルダウン */

  select.innerHTML=
    '<option value="">すべての料理</option>';

  list
    .slice()
    .sort(
      (a,b)=>
        recipeEnergy(b)-
        recipeEnergy(a)
    )
    .forEach(r=>{
      const option=
        document.createElement("option");

      option.value=r.name;
      option.textContent=r.name;

      select.appendChild(option);
    });

  state.recipeFilter="";
  select.value="";

  /* 鍋容量レンジ */

  const pots=
    list
      .map(recipePot)
      .filter(Number.isFinite);

  const min=
    pots.length
      ? Math.min(...pots)
      : 0;

  const max=
    pots.length
      ? Math.max(...pots)
      : 100;

  minInput.min=min;
  minInput.max=max;
  minInput.step=1;
  minInput.value=min;

  maxInput.min=min;
  maxInput.max=max;
  maxInput.step=1;
  maxInput.value=max;

  state.potMin=min;
  state.potMax=max;

  updatePotRangeUI();
}


function updatePotRangeUI(){
  const minInput=$("potMin");
  const maxInput=$("potMax");
  const fill=$("rangeFill");
  const label=$("potRangeLabel");

  if(
    !minInput ||
    !maxInput ||
    !fill ||
    !label
  ){
    return;
  }

  const lo=Number(minInput.min);
  const hi=Number(minInput.max);

  const min=Number(minInput.value);
  const max=Number(maxInput.value);

  const span=
    hi-lo || 1;

  label.textContent=
    `${min} ～ ${max}`;

  fill.style.left=
    `${((min-lo)/span)*100}%`;

  fill.style.right=
    `${100-((max-lo)/span)*100}%`;
}


function handlePotRange(event){
  const minInput=$("potMin");
  const maxInput=$("potMax");

  let min=
    Number(minInput.value);

  let max=
    Number(maxInput.value);

  if(min>max){
    if(event.target===minInput){
      min=max;
      minInput.value=max;
    }else{
      max=min;
      maxInput.value=min;
    }
  }

  state.potMin=min;
  state.potMax=max;

  updatePotRangeUI();
  renderRecipes();
}


function initRecipeControls(){
  $("recipeSelect").onchange=()=>{
    state.recipeFilter=
      $("recipeSelect").value;

    renderRecipes();
  };

  $("recipeSort").value=
    state.recipeSort;

  $("recipeSort").onchange=()=>{
    state.recipeSort=
      $("recipeSort").value;

    renderRecipes();
  };

  $("potMin").oninput=
    handlePotRange;

  $("potMax").oninput=
    handlePotRange;

  updateRecipeControls();
}


/* ==================================================
   料理ソート
   ================================================== */

function compareRecipes(a,b){

  /*
    パーティ選択時：
    食材一致数を最優先
  */

  if(
    state.party.some(Boolean) &&
    b.hits!==a.hits
  ){
    return b.hits-a.hits;
  }

  switch(state.recipeSort){

    case "energy-asc":
      return (
        recipeEnergy(a)-
        recipeEnergy(b)
      );

    case "pot-desc":
      return (
        recipePot(b)-
        recipePot(a) ||
        recipeEnergy(b)-
        recipeEnergy(a)
      );

    case "pot-asc":
      return (
        recipePot(a)-
        recipePot(b) ||
        recipeEnergy(b)-
        recipeEnergy(a)
      );

    case "energy-desc":
    default:
      return (
        recipeEnergy(b)-
        recipeEnergy(a)
      );
  }
}


/* ==================================================
   3. 料理候補描画
   ================================================== */

function renderRecipes(){
  const have=
    partyIngredientIds();

  $("recipes").innerHTML="";

  state.recipe=null;

  $("resultSection").classList.add("hidden");
  $("candidateSection").classList.add("hidden");

  /*
    カテゴリ内の全料理を母集団にする。

    従来の
    「パーティ0匹なら非表示」
    「一致0料理を除外」
    は撤廃。
  */

  let list=
    categoryRecipes()
      .map(r=>({
        ...r,

        hits:
          (r.ingredients||[])
            .filter(
              x=>
                have.has(
                  Number(x.id)
                )
            )
            .length
      }));

  /* 特定料理フィルター */

  if(state.recipeFilter){
    list=
      list.filter(
        r=>
          r.name===
          state.recipeFilter
      );
  }

  /* 鍋容量フィルター */

  list=
    list.filter(r=>{
      const pot=
        recipePot(r);

      return (
        pot>=state.potMin &&
        pot<=state.potMax
      );
    });

  /* ソート */

  list.sort(compareRecipes);

  /* 描画 */

  list.forEach(r=>{
    const d=
      document.createElement("div");

    d.className="card";

    const energy=
      recipeEnergy(r);

    d.innerHTML=`
      <strong>${r.name}</strong>

      <div class="muted">

        ${
          state.party.some(Boolean)
            ? `${r.hits}/${r.ingredients.length}種類に対応 / `
            : ""
        }

        鍋 ${r.pot??"-"}

        ${
          energy
            ? ` / エナジー ${energy.toLocaleString()}`
            : ""
        }

      </div>
    `;

    const iw=
      document.createElement("div");

    iw.style.cssText=
      "display:flex;flex-wrap:wrap;gap:6px;margin-top:8px";

    (r.ingredients||[])
      .forEach(x=>{
        const b=
          document.createElement("button");

        b.type="button";

        b.textContent=
          `${ingName(x.id)} ×${x.count}`;

        /*
          食材ボタンを直接押すと
          ⑤候補検索
        */

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

    /*
      カード本体を押すと
      ④不足食材
    */

    d.onclick=()=>{
      state.recipe=r;

      renderMissing();
    };

    $("recipes").appendChild(d);
  });

  if(!list.length){
    $("recipes").innerHTML=
      '<div class="muted">現在の条件に該当する料理候補はありません。</div>';
  }
}


/* ==================================================
   4. 不足食材
   ================================================== */

function renderMissing(){
  const have=
    partyIngredientIds();

  const miss=
    state.recipe.ingredients.filter(
      x=>
        !have.has(
          Number(x.id)
        )
    );

  $("resultSection").classList.remove("hidden");
  $("candidateSection").classList.add("hidden");

  $("missing").innerHTML="";

  const box=
    document.createElement("div");

  box.className="card";

  const title=
    document.createElement("strong");

  title.textContent=
    state.recipe.name;

  box.appendChild(title);

  if(!miss.length){
    const p=
      document.createElement("div");

    p.textContent=
      "必要食材の種類はすべてカバーしています。";

    box.appendChild(p);
  }

  else{
    const p=
      document.createElement("div");

    p.className="muted";

    p.textContent=
      "不足食材をタップすると候補を表示します。";

    box.appendChild(p);

    const wrap=
      document.createElement("div");

    wrap.style.cssText=
      "display:flex;flex-wrap:wrap;gap:8px;margin-top:10px";

    miss.forEach(x=>{
      const b=
        document.createElement("button");

      b.type="button";

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


/* ==================================================
   5. 候補ポケモン
   ================================================== */

function candidatePriority(p,foodId){
  if(
    p.ingredients?.A &&
    Number(p.ingredients.A.id)===foodId
  ){
    return 0;
  }

  if(
    p.ingredients?.B &&
    Number(p.ingredients.B.id)===foodId
  ){
    return 1;
  }

  if(
    p.ingredients?.C &&
    Number(p.ingredients.C.id)===foodId
  ){
    return 2;
  }

  return 9;
}


function dexParts(id){
  const match=
    String(id).match(/^(\d+)(.*)$/);

  return match
    ? [
        Number(match[1]),
        match[2]||""
      ]
    : [
        Number.MAX_SAFE_INTEGER,
        String(id)
      ];
}


function renderCandidates(foodId,requiredCount){
  state.candidateFood=foodId;
  state.candidateCount=requiredCount;

  $("candidateSection")
    .classList
    .remove("hidden");

  $("candidateTitle").textContent=
    `${ingName(foodId)} ×${requiredCount} を拾えるポケモン`;

  $("candidates").innerHTML="";

  let list=
    state.pokemon.filter(
      p=>
        Object.values(
          p.ingredients||{}
        )
        .some(
          x=>
            x &&
            Number(x.id)===foodId
        )
    );

  if(state.candidateTypes.size){
    list=
      list.filter(
        p=>
          state.candidateTypes.has(
            String(p.type)
          )
      );
  }

  const mode=
    $("candidateSort").value;

  if(mode==="ingredient"){
    list.sort(
      (a,b)=>
        candidatePriority(a,foodId)-
        candidatePriority(b,foodId) ||

        dexParts(a.id)[0]-
        dexParts(b.id)[0] ||

        dexParts(a.id)[1]
          .localeCompare(
            dexParts(b.id)[1]
          )
    );
  }

  else{
    list.sort(
      (a,b)=>
        dexParts(a.id)[0]-
        dexParts(b.id)[0] ||

        dexParts(a.id)[1]
          .localeCompare(
            dexParts(b.id)[1]
          )
    );
  }

  list.forEach(p=>{
    const hits=[];

    [
      [
        "A",
        p.ingredients?.A,
        ["lv1","lv30","lv60"]
      ],

      [
        "B",
        p.ingredients?.B,
        ["lv30","lv60"]
      ],

      [
        "C",
        p.ingredients?.C,
        ["lv60"]
      ]
    ]
    .forEach(
      ([key,data,levels])=>{

        if(
          data &&
          Number(data.id)===foodId
        ){
          const nums=
            levels.map(
              lv=>
                data.counts?.[lv]??null
            );

          const shown=
            nums
              .map(
                v=>
                  v==null
                    ? "-"
                    : v
              )
              .join("/");

          const valid=
            nums.filter(
              v=>
                typeof v==="number"
            );

          const total=
            valid.length===nums.length
              ? valid.reduce(
                  (a,b)=>a+b,
                  0
                )
              : null;

          hits.push(
            `${key}: ${shown}` +
            `${
              total==null
                ? ""
                : ` total ${total}`
            }`
          );
        }
      }
    );

    const d=
      document.createElement("div");

    d.className="card";

    d.innerHTML=`
      <strong>
        ${p.id} ${p.name}
      </strong>

      <div class="muted">

        得意:
        ${
          SPECIALTY_MASTER[
            String(p.specialty)
          ] ?? p.specialty
        }

        /

        タイプ:
        ${
          TYPE_MASTER[
            String(p.type)
          ] ?? p.type
        }

      </div>

      <div class="candidate-ingredient">

        <img
          class="ingredient-icon"
          src="${ingredientImage(foodId)}"
          alt="${ingName(foodId)}"
        >

        <span>
          ${hits.join(" ・ ")}
        </span>

      </div>
    `;

    $("candidates").appendChild(d);
  });

  if(!list.length){
    $("candidates").innerHTML=
      '<div class="muted">この食材を登録しているポケモンはいません。</div>';
  }

  $("candidateSection")
    .scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
}


/* ==================================================
   初期化
   ================================================== */

async function init(){
  try{
    const [pRes,rRes]=
      await Promise.all([
        fetch(
          "./data/pokemon_260827.json"
        ),

        fetch(
          "./data/recipes_260827.json"
        )
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

    const pData=
      await pRes.json();

    const rData=
      await rRes.json();

    state.pokemon=
      pData.pokemon;

    state.recipes=
      rData.recipes;

    state.ingredients=
      new Map(
        rData.ingredients.map(
          ingredient=>[
            Number(ingredient.id),
            ingredient
          ]
        )
      );

    /* パーティ5枠 */

    const partyArea=
      $("party");

    for(let i=0;i<5;i++){
      const member=
        makeMember(i);

      state.partyMembers.push(member);
      partyArea.appendChild(member.box);
    }

    /* カテゴリ */

    document
      .querySelectorAll(
        ".category-button"
      )
      .forEach(button=>{
        button.onclick=()=>{
          document
            .querySelectorAll(
              ".category-button"
            )
            .forEach(
              item=>
                item.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          state.category=
            button.dataset.category;

          state.recipeFilter="";

          updateRecipeControls();
          renderRecipes();
        };
      });

    /* パーティ側タイプ */

    buildTypeButtons(
      $("partyTypeGrid"),
      state.partyTypes,
      refreshPartySelects
    );

    /* 候補側タイプ */

    buildTypeButtons(
      $("candidateTypeGrid"),
      state.candidateTypes,
      ()=>{
        if(
          state.candidateFood!=null
        ){
          renderCandidates(
            state.candidateFood,
            state.candidateCount
          );
        }
      }
    );

    /* 候補ソート */

    $("candidateSort").onchange=()=>{
      if(
        state.candidateFood!=null
      ){
        renderCandidates(
          state.candidateFood,
          state.candidateCount
        );
      }
    };

    /* ③新UI */

    initRecipeControls();

    /* パーティ一括リセット */

    $("partyReset").onclick=()=>{
      state.party=
        Array(5).fill(null);

      state.recipe=null;
      state.candidateFood=null;
      state.candidateCount=null;

      state.partyMembers.forEach(member=>{
        member.pokemon=null;

        member.choice=[
          0,
          0,
          0
        ];

        member.sel.value="";

        renderFoods(member);
      });

      $("resultSection")
        .classList
        .add("hidden");

      $("candidateSection")
        .classList
        .add("hidden");

      renderRecipes();
    };

    /* 初回描画 */

    renderRecipes();

    $("status").textContent=
      `GitHub版：ポケモン ${state.pokemon.length}件 / 料理 ${state.recipes.length}件`;
  }

  catch(error){
    $("status").textContent=
      `データ読込エラー：${error.message}`;

    console.error(error);
  }
}


init();