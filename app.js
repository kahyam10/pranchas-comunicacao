(function () {
  'use strict';

  var palco = document.getElementById('palco');
  var trilho = document.getElementById('trilho');
  var originais = Array.prototype.slice.call(trilho.children);
  var N = originais.length;

  // Clones nas pontas para dar a volta: [última] 1 2 3 4 [primeira]
  trilho.insertBefore(originais[N - 1].cloneNode(true), originais[0]);
  trilho.appendChild(originais[0].cloneNode(true));

  var pos = 1;            // posição no trilho (1..N são as reais)
  var animando = false;
  var DURACAO = 260;      // ms

  function aplicar(deslocPx, comAnimacao) {
    trilho.style.transition = comAnimacao
      ? 'transform ' + DURACAO + 'ms cubic-bezier(.2,.7,.2,1)'
      : 'none';
    trilho.style.transform =
      'translate3d(calc(' + (-pos * 100) + '% + ' + deslocPx + 'px),0,0)';
  }

  function normalizar() {
    if (pos <= 0) pos = N;
    else if (pos >= N + 1) pos = 1;
    animando = false;
    aplicar(0, false);
  }

  trilho.addEventListener('transitionend', normalizar);

  function irPara(delta) {
    pos += delta;
    animando = true;
    aplicar(0, true);
  }

  aplicar(0, false);

  // ---- Gestos (toque, caneta ou mouse) ----
  var ativo = null;   // { id, x0, y0, t0, eixo }
  var LIMIAR_DIST = 0.18;   // 18% da largura da tela
  var LIMIAR_VEL = 0.35;    // px/ms para "piparote" rápido
  var MIN_PIPAROTE = 40;    // px mínimos mesmo em gesto rápido

  palco.addEventListener('pointerdown', function (e) {
    if (ativo) { cancelar(); return; }          // segundo dedo: ignora gesto
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (animando) normalizar();
    ativo = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, eixo: null };
    try { palco.setPointerCapture(e.pointerId); } catch (_) {}
  });

  palco.addEventListener('pointermove', function (e) {
    if (!ativo || e.pointerId !== ativo.id) return;
    var dx = e.clientX - ativo.x0, dy = e.clientY - ativo.y0;
    if (!ativo.eixo && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      ativo.eixo = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    if (ativo.eixo === 'x') aplicar(dx, false);
  });

  function terminar(e) {
    if (!ativo || e.pointerId !== ativo.id) return;
    var dx = e.clientX - ativo.x0;
    var dt = Math.max(1, e.timeStamp - ativo.t0);
    var vel = dx / dt;
    var largura = palco.clientWidth || 1;
    var eixo = ativo.eixo;
    ativo = null;
    if (eixo !== 'x') return;
    var passou = Math.abs(dx) > largura * LIMIAR_DIST ||
                 (Math.abs(dx) > MIN_PIPAROTE && Math.abs(vel) > LIMIAR_VEL);
    if (passou) irPara(dx < 0 ? 1 : -1);
    else { animando = true; aplicar(0, true); }   // volta para o lugar
  }

  function cancelar() {
    if (!ativo) return;
    ativo = null;
    animando = true;
    aplicar(0, true);
  }

  palco.addEventListener('pointerup', terminar);
  palco.addEventListener('pointercancel', cancelar);

  // Setas do teclado (útil para testar no computador)
  document.addEventListener('keydown', function (e) {
    if (animando) normalizar();
    if (e.key === 'ArrowRight') irPara(1);
    else if (e.key === 'ArrowLeft') irPara(-1);
  });

  // Sem menu de "salvar imagem" ao segurar o dedo
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---- Tela cheia + paisagem quando aberto pelo navegador (antes de instalar) ----
  function instalado() {
    return window.matchMedia('(display-mode: fullscreen)').matches ||
           window.matchMedia('(display-mode: standalone)').matches;
  }
  function pedirTelaCheia() {
    if (instalado() || document.fullscreenElement) return;
    var el = document.documentElement;
    if (!el.requestFullscreen) return;
    el.requestFullscreen({ navigationUI: 'hide' }).then(function () {
      if (screen.orientation && screen.orientation.lock) {
        return screen.orientation.lock('landscape');
      }
    }).catch(function () {});
  }
  document.addEventListener('pointerup', pedirTelaCheia);

  // ---- Funcionar offline ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
