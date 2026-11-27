const $=id=>document.getElementById(id);
const audio=$('audio');let tracks=[],current=-1,liked=new Set(),shuffle=false,repeat=0,activeTab='all',toastTimer;
const dbName='music-supreme-db';
function toast(s){const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200)}
function fmt(n){if(!Number.isFinite(n))return'0:00';return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0')}
function persist(){try{localStorage.setItem('ms_liked',JSON.stringify([...liked]));localStorage.setItem('ms_meta',JSON.stringify(tracks.map(({id,name,artist,size,lastModified})=>({id,name,artist,size,lastModified}))))}catch(e){}}
function loadLikes(){try{liked=new Set(JSON.parse(localStorage.getItem('ms_liked')||'[]'))}catch(e){}}
function renderSongList(el,arr){el.innerHTML='';if(!arr.length){el.className='song-list empty-state';el.textContent='No music here yet. Tap “Add music” to import audio from your phone.';return}el.className='song-list';arr.forEach(t=>{const row=document.createElement('div');row.className='song-row';const art=document.createElement('div');art.className='song-art';art.textContent='♫';const meta=document.createElement('div');meta.className='song-meta';const b=document.createElement('b');b.textContent=t.name;const sm=document.createElement('small');sm.textContent=t.artist;meta.append(b,sm);const like=document.createElement('button');like.textContent=liked.has(t.id)?'♥':'♡';like.setAttribute('aria-label','Like');like.onclick=()=>{liked.has(t.id)?liked.delete(t.id):liked.add(t.id);persist();renderAll()};const play=document.createElement('button');play.textContent='▶';play.onclick=()=>playTrack(tracks.findIndex(x=>x.id===t.id));row.append(art,meta,like,play);el.append(row)})}
function renderAll(){renderSongList($('quickPicks'),tracks.slice(0,6));renderSongList($('discoverList'),[...tracks].reverse());renderSongList($('libraryList'),activeTab==='liked'?tracks.filter(t=>liked.has(t.id)):tracks);search()}
function search(){const q=$('searchInput').value.trim().toLowerCase();renderSongList($('searchResults'),q?tracks.filter(t=>(t.name+' '+t.artist).toLowerCase().includes(q)):[])}
function playTrack(i){if(i<0||i>=tracks.length)return;current=i;audio.src=tracks[i].url;audio.play().then(()=>toast('Now playing')).catch(()=>toast('Unable to play this file'));updatePlayer()}
function updatePlayer(){if(current<0)return;const t=tracks[current];$('miniPlayer').classList.remove('hidden');$('miniTitle').textContent=t.name;$('miniArtist').textContent=t.artist;$('playerTitle').textContent=t.name;$('playerArtist').textContent=t.artist;$('likeBtn').textContent=liked.has(t.id)?'♥':'♡';$('miniPlay').textContent=audio.paused?'▶':'Ⅱ';$('playBtn').textContent=audio.paused?'▶':'Ⅱ'}
function togglePlay(){if(current<0){if(tracks.length)playTrack(0);else toast('Import music first');return}audio.paused?audio.play():audio.pause();updatePlayer()}
function next(){if(!tracks.length)return;let i=shuffle?Math.floor(Math.random()*tracks.length):(current+1)%tracks.length;playTrack(i)}
function prev(){if(audio.currentTime>3){audio.currentTime=0;return}playTrack((current-1+tracks.length)%tracks.length)}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===id))}
$('pickMusic').onclick=$('discoverAdd').onclick=()=>$('fileInput').click();
$('fileInput').onchange=e=>{const fs=[...e.target.files];fs.forEach(f=>{const id=[f.name,f.size,f.lastModified].join('_');if(!tracks.some(t=>t.id===id))tracks.push({id,name:f.name.replace(/\.[^.]+$/,''),artist:'On this device',url:URL.createObjectURL(f),size:f.size,lastModified:f.lastModified})});persist();renderAll();toast(fs.length+' file(s) added');e.target.value=''};
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$('profileBtn').onclick=()=>showPage('profilePage');
$('miniPlay').onclick=togglePlay;$('openPlayer').onclick=()=>$('playerOverlay').classList.remove('hidden');$('closePlayer').onclick=()=>$('playerOverlay').classList.add('hidden');
$('playBtn').onclick=togglePlay;$('prevBtn').onclick=prev;$('nextBtn').onclick=next;
$('shuffleBtn').onclick=()=>{shuffle=!shuffle;$('shuffleBtn').style.opacity=shuffle?'1':'.5';toast(shuffle?'Shuffle on':'Shuffle off')};
$('repeatBtn').onclick=()=>{repeat=(repeat+1)%3;$('repeatBtn').textContent=repeat===1?'↻1':'↻';toast(['Repeat off','Repeat one','Repeat all'][repeat])};
$('likeBtn').onclick=()=>{if(current<0)return;const id=tracks[current].id;liked.has(id)?liked.delete(id):liked.add(id);persist();updatePlayer();renderAll()};
$('seekBar').oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*e.target.value/100};
audio.ontimeupdate=()=>{if(Number.isFinite(audio.duration)){$('seekBar').value=audio.currentTime/audio.duration*100;$('currentTime').textContent=fmt(audio.currentTime);$('duration').textContent=fmt(audio.duration)}};
audio.onplay=updatePlayer;audio.onpause=updatePlayer;audio.onended=()=>{if(repeat===1){audio.currentTime=0;audio.play()}else if(current<tracks.length-1||repeat===2)next();else updatePlayer()};
$('searchInput').oninput=search;
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));renderAll()});
document.querySelectorAll('.mood-card').forEach(b=>b.onclick=()=>{showPage('discoverPage');toast(b.dataset.mood+' mood selected')});
let startY=0;$('playerOverlay').addEventListener('touchstart',e=>startY=e.touches[0].clientY,{passive:true});$('playerOverlay').addEventListener('touchend',e=>{const dy=e.changedTouches[0].clientY-startY;if(Math.abs(dy)>70){if(dy<0)next();else prev()}},{passive:true});
loadLikes();renderAll();
