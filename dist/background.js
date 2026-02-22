import{a as m,o as P,G as k,s as v,d as T,b as $,g as L,c as y,e as f}from"./assets/config-CXb8XrOZ.js";async function b(e,r){console.log("Analyzing page with Gemini Vision API...");const t=r.geminiApiKey?.trim();if(!t)throw new Error("Gemini APIキーが設定されていません。");const o=r.skills.map(s=>`- ${s.name}: ${s.years}年 (Lv.${s.level}${s.isProfessional?", 実務あり":""})`).join(`
`),a=e.split(",")[1],i={contents:[{parts:[{text:`
あなたはフリーランスエンジニアの強力なエージェント「Lito」です。提供されたスクリーンショットの案件詳細を解析してください。

ユーザープロフィール：
- 希望単価：月${r.targetRate.toLocaleString()}円
- 職種：${r.category}
- スキル：
${o}

上記プロフィールに合わせたアドバイスを3つ、具体的かつ簡潔に回答してください。
回答形式：3つの箇条書き（改行区切り）
`},{inlineData:{mimeType:"image/png",data:a}}]}]};async function c(s){const n=`https://generativelanguage.googleapis.com/v1beta/models/${s}:generateContent?key=${t}`;return fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)})}async function d(){const s=`https://generativelanguage.googleapis.com/v1beta/models?key=${t}`;try{const l=await(await fetch(s)).json();return console.log("Available models for this key:",l.models?.map(g=>g.name)),l.models||[]}catch(n){return console.error("Failed to list models:",n),[]}}try{const s=["gemini-2.0-flash","gemini-flash-latest","gemini-1.5-flash","gemini-1.5-pro"];let n=null;for(const l of s){console.log(`Attempting analysis with ${l}...`);const g=await c(l);if(g.ok){const h=((await g.json()).candidates?.[0]?.content?.parts?.[0]?.text||"").split(`
`).map(p=>p.replace(/^[*-]\s*/,"").trim()).filter(p=>p.length>0).slice(0,3);return{timestamp:new Date().toISOString(),suggestions:h.length>0?h:["解析結果が得られませんでした。"]}}if(n=g,g.status!==404)break}if(n&&!n.ok){const l=await n.json().catch(()=>({}));throw console.error("Gemini API Final Error Detail:",l),n.status===404?(await d(),new Error("利用可能なGeminiモデルが見つかりません(404)。Google Cloud Consoleで『Generative Language API』を有効にしてから数分待つか、AI Studioで新しいプロジェクトを作成して新しいキーを取得してみてください。")):new Error(`APIエラー (${n.status}): ${l.error?.message||"不明なエラー"}`)}throw new Error("解析リクエストに失敗しました。")}catch(s){throw console.error("Analysis execution failed:",s),s}}async function x(e,r){const t=e.geminiApiKey?.trim();if(!t)throw new Error("APIキーがありません");const u={contents:[{parts:[{text:`
あなたはユーザーの代理人エンジニアです。以下の案件解析結果とスキルに基づき、クライアントに送る「応募文（提案文）」を作成してください。
文体は丁寧ですが、プロフェッショナルな自信を感じさせるものにしてください。

ユーザーのスキル：${e.skills.map(d=>`- ${d.name}: ${d.years}年`).join(", ")}
案件解析のポイント：${r.suggestions.join(" / ")}

構成：
1. 挨拶
2. 案件への関心と適合する理由
3. 具体的な貢献内容
4. 結びの言葉

返信は「応募文の本文のみ」を出力してください。
`}]}]},i=await w("gemini-2.0-flash",t,u);if(!i.ok)throw new Error("応募文の生成に失敗しました");return(await i.json()).candidates?.[0]?.content?.parts?.[0]?.text||"生成に失敗しました。"}async function E(e,r,t){const o=e.geminiApiKey?.trim();if(!o)throw new Error("APIキーがありません");const a=t.history?.slice(-5).map(s=>({role:s.role==="user"?"user":"model",parts:[{text:s.text}]}))||[],i={contents:[{role:"user",parts:[{text:`
あなたはフリーランスエンジニアのエージェント「Lito」です。
ユーザーは案件ページを見ながら、あなたに「独り言」のように不安や質問を投げかけています。
前回の解析結果（${t.analysisResults?.suggestions.join("、")}）を踏まえ、
ユーザーを励ましつつ、エンジニアとしての客観的な視点でアドバイスを返してください。
回答は親しみやすく、かつ短く（150文字以内）まとめてください。
`}]},{role:"model",parts:[{text:"了解しました。エージェントLitoとして、解析結果に基づきアドバイスします。"}]},...a,{role:"user",parts:[{text:r}]}]},c=await w("gemini-2.0-flash",o,i);if(!c.ok)throw new Error("チャット回答の取得に失敗しました");return(await c.json()).candidates?.[0]?.content?.parts?.[0]?.text||"お答えできませんでした。"}async function w(e,r,t){const o=`https://generativelanguage.googleapis.com/v1beta/models/${e}:generateContent?key=${r}`;return fetch(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})}async function A(){try{const e=await new Promise((a,u)=>{chrome.identity.getAuthToken({interactive:!0},i=>{if(chrome.runtime.lastError)return u(new Error(chrome.runtime.lastError.message));const c=typeof i=="string"?i:i?.token;if(!c)return u(new Error("Failed to get auth token"));a(c)})}),r=k.credential(null,e),o=(await v(m,r)).user;console.log("Logged in via Identity API:",o.uid),await S(o)}catch(e){console.error("Login failed:",e)}}async function S(e){const{uid:r,email:t,displayName:o}=e,a=T($,"users",r);(await L(a)).exists()?await y(a,{email:t,displayName:o,lastLoginAt:f()},{merge:!0}):await y(a,{email:t,displayName:o,createdAt:f(),skills:[],preferences:{targetRate:0,category:""}}),console.log("User synced to Firestore:",r)}chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0}).catch(console.error);chrome.action.onClicked.addListener(()=>{m.currentUser||A()});chrome.runtime.onMessage.addListener((e,r,t)=>{if(e.type==="START_ANALYSIS")return I(e.profile).then(t),!0;if(e.type==="LOGIN")return console.log("LOGIN message received from sidepanel"),A().then(()=>t({success:!0})).catch(o=>t({success:!1,error:o.message})),!0;if(e.type==="GENERATE_PROPOSAL")return C(e.profile,e.analysisResults).then(t),!0;if(e.type==="SOLILOQUY_CHAT")return G(e.profile,e.message,e.context).then(t),!0});async function I(e){try{console.log("Analysis request received with profile:",e);const[r]=await chrome.tabs.query({active:!0,currentWindow:!0});if(!r||!r.id)throw new Error("No active tab found");const t=await chrome.tabs.captureVisibleTab();return console.log("Screenshot captured successfully"),{success:!0,results:await b(t,e)}}catch(r){return console.error("Analysis handler failed:",r),{success:!1,error:r.message}}}async function C(e,r){try{return{success:!0,proposal:await x(e,r)}}catch(t){return{success:!1,error:t.message}}}async function G(e,r,t){try{return{success:!0,reply:await E(e,r,t)}}catch(o){return{success:!1,error:o.message}}}P(m,e=>{e?console.log("User is logged in:",e.uid):console.log("User is logged out")});
