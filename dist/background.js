import{a as h,o as $,G as P,s as T,d as k,b as E,g as v,c as y,e as f}from"./assets/config-CXb8XrOZ.js";async function b(e,o){console.log("Analyzing page with Gemini Vision API...");const t=o.geminiApiKey?.trim();if(!t)throw new Error("Gemini APIキーが設定されていません。");const n=o.skills.map(r=>`- ${r.name}: ${r.years}年 (Lv.${r.level}${r.isProfessional?", 実務あり":""})`).join(`
`),c=e.split(",")[1],u={contents:[{parts:[{text:`
あなたはフリーランスエンジニアの強力なエージェント「Lito」です。提供されたスクリーンショットの案件詳細を解析してください。

ユーザープロフィール：
- 希望単価：月${o.targetRate.toLocaleString()}円
- 職種：${o.category}
- スキル：
${n}

上記プロフィールに合わせたアドバイスを3つ、具体的かつ簡潔に回答してください。
回答形式：3つの箇条書き（改行区切り）
`},{inlineData:{mimeType:"image/png",data:c}}]}]};async function l(r){const s=`https://generativelanguage.googleapis.com/v1beta/models/${r}:generateContent?key=${t}`;return fetch(s,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(u)})}async function a(){const r=`https://generativelanguage.googleapis.com/v1beta/models?key=${t}`;try{const i=await(await fetch(r)).json();return console.log("Available models for this key:",i.models?.map(m=>m.name)),i.models||[]}catch(s){return console.error("Failed to list models:",s),[]}}try{const r=["gemini-2.0-flash","gemini-flash-latest","gemini-1.5-flash","gemini-1.5-pro"];let s=null;for(const i of r){console.log(`Attempting analysis with ${i}...`);const m=await l(i);if(m.ok){const p=((await m.json()).candidates?.[0]?.content?.parts?.[0]?.text||"").split(`
`).map(d=>d.replace(/^[*-]\s*/,"").trim()).filter(d=>d.length>0).slice(0,3);return{timestamp:new Date().toISOString(),suggestions:p.length>0?p:["解析結果が得られませんでした。"]}}if(s=m,m.status!==404)break}if(s&&!s.ok){const i=await s.json().catch(()=>({}));throw console.error("Gemini API Final Error Detail:",i),s.status===404?(await a(),new Error("利用可能なGeminiモデルが見つかりません(404)。Google Cloud Consoleで『Generative Language API』を有効にしてから数分待つか、AI Studioで新しいプロジェクトを作成して新しいキーを取得してみてください。")):new Error(`APIエラー (${s.status}): ${i.error?.message||"不明なエラー"}`)}throw new Error("解析リクエストに失敗しました。")}catch(r){throw console.error("Analysis execution failed:",r),r}}async function I(e,o){const t=e.geminiApiKey?.trim();if(!t)throw new Error("APIキーが設定されていません。");const g={contents:[{parts:[{text:`
あなたはユーザーの代理人エンジニアです。以下の案件解析結果とスキルに基づき、クライアントに送る「応募文（提案文）」を作成してください。
文体は丁寧ですが、プロフェッショナルな自信を感じさせるものにしてください。

ユーザーのスキル：${e.skills.map(a=>`- ${a.name}: ${a.years}年`).join(", ")}
案件解析のポイント：${o.suggestions.join(" / ")}

構成：
1. 挨拶
2. 案件への関心と適合する理由
3. 具体的な貢献内容
4. 結びの言葉

返信は「応募文の本文のみ」を出力してください。
`}]}]},u=["gemini-2.0-flash","gemini-flash-latest","gemini-1.5-flash"];let l=null;for(const a of u)try{console.log(`Attempting proposal generation with ${a}...`);const r=await w(a,t,g);if(r.ok)return(await r.json()).candidates?.[0]?.content?.parts?.[0]?.text||"応募文を生成できませんでした。";const s=await r.json().catch(()=>({}));if(l=new Error(`APIエラー (${r.status}): ${s.error?.message||"不明なエラー"}`),r.status!==404)break}catch(r){l=r}throw l||new Error("応募文の生成に失敗しました。")}async function L(e,o,t){const n=e.geminiApiKey?.trim();if(!n)throw new Error("APIキーが設定されていません。");const c=t.history?.slice(-5).map(r=>({role:r.role==="user"?"user":"model",parts:[{text:r.text}]}))||[],u={contents:[{role:"user",parts:[{text:`
あなたはフリーランスエンジニアのエージェント「Lito」です。
ユーザーは案件ページを見ながら、あなたに「独り言」のように不安や質問を投げかけています。
前回の解析結果（${t.analysisResults?.suggestions.join("、")}）を踏まえ、
ユーザーを励ましつつ、エンジニアとしての客観的な視点でアドバイスを返してください。
回答は親しみやすく、かつ短く（150文字以内）まとめてください。
`}]},{role:"model",parts:[{text:"了解しました。エージェントLitoとして、解析結果に基づきアドバイスします。"}]},...c,{role:"user",parts:[{text:o}]}]},l=["gemini-2.0-flash","gemini-flash-latest","gemini-1.5-flash"];let a=null;for(const r of l)try{console.log(`Attempting chat with ${r}...`);const s=await w(r,n,u);if(s.ok)return(await s.json()).candidates?.[0]?.content?.parts?.[0]?.text||"お答えできませんでした。";const i=await s.json().catch(()=>({}));if(a=new Error(`APIエラー (${s.status}): ${i.error?.message||"不明なエラー"}`),s.status!==404)break}catch(s){a=s}throw a||new Error("チャット回答の取得に失敗しました。")}async function w(e,o,t){const n=`https://generativelanguage.googleapis.com/v1beta/models/${e}:generateContent?key=${o}`;return fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})}async function A(){try{const e=await new Promise((c,g)=>{chrome.identity.getAuthToken({interactive:!0},u=>{if(chrome.runtime.lastError)return g(new Error(chrome.runtime.lastError.message));const l=typeof u=="string"?u:u?.token;if(!l)return g(new Error("Failed to get auth token"));c(l)})}),o=P.credential(null,e),n=(await T(h,o)).user;console.log("Logged in via Identity API:",n.uid),await x(n)}catch(e){console.error("Login failed:",e)}}async function x(e){const{uid:o,email:t,displayName:n}=e,c=k(E,"users",o);(await v(c)).exists()?await y(c,{email:t,displayName:n,lastLoginAt:f()},{merge:!0}):await y(c,{email:t,displayName:n,createdAt:f(),skills:[],preferences:{targetRate:0,category:""}}),console.log("User synced to Firestore:",o)}chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0}).catch(console.error);chrome.action.onClicked.addListener(()=>{h.currentUser||A()});chrome.runtime.onMessage.addListener((e,o,t)=>{if(e.type==="START_ANALYSIS")return S(e.profile).then(t),!0;if(e.type==="LOGIN")return console.log("LOGIN message received from sidepanel"),A().then(()=>t({success:!0})).catch(n=>t({success:!1,error:n.message})),!0;if(e.type==="GENERATE_PROPOSAL")return C(e.profile,e.analysisResults).then(t),!0;if(e.type==="SOLILOQUY_CHAT")return G(e.profile,e.message,e.context).then(t),!0});async function S(e){try{console.log("Analysis request received with profile:",e);const[o]=await chrome.tabs.query({active:!0,currentWindow:!0});if(!o||!o.id)throw new Error("No active tab found");const t=await chrome.tabs.captureVisibleTab();return console.log("Screenshot captured successfully"),{success:!0,results:await b(t,e)}}catch(o){return console.error("Analysis handler failed:",o),{success:!1,error:o.message}}}async function C(e,o){try{return{success:!0,proposal:await I(e,o)}}catch(t){return{success:!1,error:t.message}}}async function G(e,o,t){try{return{success:!0,reply:await L(e,o,t)}}catch(n){return{success:!1,error:n.message}}}$(h,e=>{e?console.log("User is logged in:",e.uid):console.log("User is logged out")});
