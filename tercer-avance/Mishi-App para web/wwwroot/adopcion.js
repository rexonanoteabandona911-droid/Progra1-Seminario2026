// @ts-nocheck
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    var API = '/api/adopciones';
    var $ = function (id) { return document.getElementById(id); };

    var lista = [];
    var seleccionado = null;
    var nroSeleccionado = null;
    var filtro = 'todos';
    var ocupado = false;

    function esc(t) {
        var d = document.createElement('div'); d.textContent = t == null ? '' : t;
        return d.innerHTML.replace(/"/g, '&quot;');
    }
    function norm(t) { return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
    function tomar(o, claves) {
        if (!o || typeof o !== 'object') return '';
        for (var i = 0; i < claves.length; i++) {
            var v = o[claves[i]];
            if (v !== undefined && v !== null) return v;
        }
        return '';
    }
    function hoy() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function sinHora(v) { return v ? String(v).substring(0, 10) : ''; }
    function bonita(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }

    function ordenar(arr) {
        return arr.sort(function (a, b) {
            return Number(a.id || 0) - Number(b.id || 0);
        });
    }

    function nroCorrelativo(idReal) {
        for (var i = 0; i < lista.length; i++) {
            if (String(lista[i].id) === String(idReal)) return i + 1;
        }
        return idReal;
    }

    async function llamar(metodo, url, cuerpo) {
        var op = { method: metodo, headers: {} };
        if (cuerpo !== undefined) { op.headers['Content-Type'] = 'application/json'; op.body = JSON.stringify(cuerpo); }
        var r = await fetch(url, op), txt = await r.text(), datos = null;
        try { datos = txt ? JSON.parse(txt) : null; } catch (e) { }
        return { ok: r.ok, status: r.status, datos: datos, texto: txt };
    }

    function mensajeError(r) {
        var d = r.datos;
        if (d) {
            if (typeof d === 'string') return d;
            if (d.mensaje) return d.mensaje + ' (error ' + r.status + ')';
            if (d.message) return d.message;
            if (d.detail) return d.detail;
            if (d.errors) { var m = []; Object.keys(d.errors).forEach(function (k) { m.push([].concat(d.errors[k]).join(' ')); }); if (m.length) return m.join(' '); }
            if (d.title) return d.title + ' (error ' + r.status + ')';
        }
        if (r.status === 404) return 'No se encontró la ruta ' + API + ' (error 404).';
        if (r.status === 405) return 'El servidor no permite esta operación (error 405).';
        if (r.texto && r.texto.length < 300 && r.texto.charAt(0) !== '<') return r.texto;
        return 'El servidor respondió con el error ' + r.status + '.';
    }

    var ICONOS = { ok: 'fa-circle-check', error: 'fa-circle-xmark', warn: 'fa-triangle-exclamation' };
    function cerrarModal() { $('modalOverlay').classList.remove('abierto'); }
    function modal(tipo, titulo, mensaje, botones) {
        $('modalCaja').className = 'modal ' + tipo;
        $('modalIcono').className = 'fa-solid ' + ICONOS[tipo];
        $('modalTitulo').textContent = titulo;
        $('modalMensaje').textContent = mensaje;
        var cont = $('modalBotones'); cont.innerHTML = '';
        (botones || [{ texto: 'Aceptar', clase: 'principal', accion: cerrarModal }]).forEach(function (b) {
            var el = document.createElement('button'); el.type = 'button'; el.textContent = b.texto;
            if (b.clase) el.className = b.clase; el.addEventListener('click', b.accion); cont.appendChild(el);
        });
        $('modalOverlay').classList.add('abierto');
        var p = cont.querySelector('.principal') || cont.querySelector('.peligro') || cont.querySelector('button'); if (p) p.focus();
    }
    function advertir(titulo, mensaje, textoSi, claseSi, accion) {
        modal('warn', titulo, mensaje, [
            { texto: 'Cancelar', accion: cerrarModal },
            { texto: textoSi, clase: claseSi, accion: function () { cerrarModal(); accion(); } }
        ]);
    }
    function sinConexion() { modal('error', 'Sin conexión', 'No se pudo conectar con el servidor. Verifica que la API esté en ejecución.'); }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('modalOverlay').classList.contains('abierto')) cerrarModal(); });
    $('modalOverlay').addEventListener('click', function (e) { if (e.target === $('modalOverlay')) cerrarModal(); });
    if ($('navToggle')) {
        $('navToggle').addEventListener('click', function () { $('navMenu').classList.toggle('abierto'); });
    }

    var GRUPOS = ['grpAdoptante', 'grpGato', 'grpFecha', 'grpObs'];
    function marcar(g, invalido) { var c = $(g); if (!c) return; c.classList.remove('invalido'); if (invalido) { void c.offsetWidth; c.classList.add('invalido'); } }
    $('txtAdoptante').addEventListener('input', function () { marcar('grpAdoptante', false); });
    $('txtGato').addEventListener('input', function () { marcar('grpGato', false); });
    $('txtFecha').addEventListener('input', function () { marcar('grpFecha', false); });

    function actualizarModo() {
        var ed = seleccionado !== null;
        var nroActual = ed ? (nroSeleccionado || nroCorrelativo(seleccionado)) : null;
        $('badgeModo').className = 'modo' + (ed ? ' editando' : '');
        $('txtModo').textContent = ed ? 'Editando adopción #' + nroActual : 'Nuevo registro';
        $('btnAgregar').disabled = ed;
        $('btnModificar').disabled = !ed;
        $('btnEliminar').disabled = !ed;
    }

    function cargando(si) {
        ocupado = si;
        $('btnAgregar').classList.toggle('cargando', si);
        if (si) {
            $('btnAgregar').disabled = true; $('btnModificar').disabled = true; $('btnEliminar').disabled = true;
        } else actualizarModo();
    }

    function reiniciar() {
        seleccionado = null;
        nroSeleccionado = null;
        $('txtId').value = '';
        $('txtAdoptante').value = '';
        $('txtGato').value = '';
        $('txtFecha').value = hoy();
        $('txtObservaciones').value = '';
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo(); dibujar();
    }

    function seleccionar(id, nroVisible) {
        var r = lista.filter(function (x) { return String(x.id) === String(id); })[0]; if (!r) return;
        seleccionado = r.id;
        nroSeleccionado = nroVisible != null ? nroVisible : nroCorrelativo(r.id);
        $('txtId').value = '#' + nroSeleccionado;
        $('txtAdoptante').value = r.adoptante;
        $('txtGato').value = r.gato;
        $('txtFecha').value = r.fechaAdopcion;
        $('txtObservaciones').value = r.observaciones;
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo(); dibujar();
        if (window.innerWidth <= 1050 && $('formAdopcion')) $('formAdopcion').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function leer() {
        var v = {
            adoptante: $('txtAdoptante').value.trim(),
            gato: $('txtGato').value.trim(),
            fecha: $('txtFecha').value,
            obs: $('txtObservaciones').value.trim()
        };
        var malAdop = !v.adoptante, malGato = !v.gato, malFecha = !v.fecha;
        $('errFecha').textContent = 'Selecciona la fecha de adopción.';
        if (v.fecha && v.fecha > hoy()) { malFecha = true; $('errFecha').textContent = 'La fecha de adopción no puede ser futura.'; }
        marcar('grpAdoptante', malAdop);
        marcar('grpGato', malGato);
        marcar('grpFecha', malFecha);
        if (malAdop || malGato || malFecha) return null;
        return { nombreAdoptante: v.adoptante, nombreGato: v.gato, fechaAdopcion: v.fecha, observaciones: v.obs };
    }

    function describir(d) {
        return 'del adoptante ' + d.nombreAdoptante + ' y gato ' + d.nombreGato + ' con fecha ' + bonita(d.fechaAdopcion);
    }

    function coincide(f, r) {
        if (f === 'mes') return r.fechaAdopcion.substring(0, 7) === hoy().substring(0, 7);
        if (f === 'notas') return r.observaciones !== '';
        return true;
    }

    function pajar(r, nroVisual) {
        return norm(['#' + nroVisual, '#' + r.id, r.adoptante, r.gato, bonita(r.fechaAdopcion), r.fechaAdopcion, r.observaciones].join(' '));
    }

    function contar(f) { return lista.filter(function (r) { return coincide(f, r); }).length; }

    function dibujar() {
        var tbody = $('tbodyAdopciones');
        var buscado = $('txtBuscar').value;
        var palabras = norm(buscado).split(/\s+/).filter(Boolean);
        $('btnBorrarBusqueda').classList.toggle('visible', buscado.length > 0);
        $('statTotal').textContent = lista.length;
        $('statMes').textContent = contar('mes');
        $('statNotas').textContent = contar('notas');

        var f = lista.filter(function (r, idx) {
            if (!coincide(filtro, r)) return false;
            var p = pajar(r, idx + 1);
            return palabras.every(function (w) { return p.indexOf(w) !== -1; });
        });
        if ($('lblCantMostrada')) $('lblCantMostrada').textContent = f.length;

        if (!f.length) {
            var titulo, detalle;
            if (!lista.length) { titulo = 'Aún no hay adopciones registradas'; detalle = 'Registra la primera adopción con el formulario.'; }
            else if (palabras.length) { titulo = 'Sin resultados para "' + buscado.trim() + '"'; detalle = 'Prueba con otro nombre de adoptante, gato, fecha u observación.'; }
            else if (filtro === 'mes') { titulo = 'No hay adopciones este mes'; detalle = 'Todavía no se ha registrado ninguna adopción en el mes actual.'; }
            else { titulo = 'No hay adopciones con observaciones'; detalle = 'Ninguna adopción tiene notas escritas.'; }
            tbody.innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-heart"></i><h3>' + esc(titulo) + '</h3><p>' + esc(detalle) + '</p></div></td></tr>';
            return;
        }

        var h = '';
        f.forEach(function (r, i) {
            var sel = seleccionado !== null && String(seleccionado) === String(r.id);
            var nroVisual = i + 1;
            var adoptante = r.adoptante || 'Sin adoptante';
            var gato = r.gato || 'Sin gato';
            var obsTexto = String(r.observaciones || '').trim();
            var celdaObs = obsTexto
                ? '<span class="etq obs" title="' + esc(obsTexto) + '"><i class="fa-solid fa-comment-dots"></i><span>' + esc(obsTexto) + '</span></span>'
                : '<span class="suave">Sin observaciones</span>';

            h += '<tr class="fila' + (sel ? ' sel' : '') + '" data-id="' + esc(r.id) + '" data-nro="' + nroVisual + '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms">' +
                '<td class="id-num">#' + nroVisual + '</td>' +
                '<td><div class="celda-usuario"><span class="av">' + esc(adoptante.charAt(0).toUpperCase()) + '</span><b>' + esc(adoptante) + '</b></div></td>' +
                '<td><span class="etq"><i class="fa-solid fa-cat"></i> ' + esc(gato) + '</span></td>' +
                '<td class="suave">' + esc(bonita(r.fechaAdopcion)) + '</td>' +
                '<td>' + celdaObs + '</td></tr>';
        });
        tbody.innerHTML = h;
    }

    $('tbodyAdopciones').addEventListener('click', function (e) {
        var f = e.target.closest('tr.fila');
        if (f) seleccionar(f.getAttribute('data-id'), Number(f.getAttribute('data-nro')));
    });
    $('txtBuscar').addEventListener('input', dibujar);
    $('btnBorrarBusqueda').addEventListener('click', function () { $('txtBuscar').value = ''; dibujar(); $('txtBuscar').focus(); });

    var controles = document.querySelectorAll('[data-filtro]');
    controles.forEach(function (c) {
        c.addEventListener('click', function () {
            filtro = c.getAttribute('data-filtro');
            controles.forEach(function (x) { x.classList.toggle('activo', x.getAttribute('data-filtro') === filtro); });
            dibujar();
        });
    });

    function normalizar(x) {
        return {
            id: tomar(x, ['id', 'Id', 'id_adopcion']),
            adoptante: tomar(x, ['adoptante', 'Adoptante', 'nombreAdoptante', 'Nombre_Adoptante']),
            gato: tomar(x, ['gato', 'Gato', 'nombreGato', 'Nombre_Gato']),
            fechaAdopcion: sinHora(tomar(x, ['fechaAdopcion', 'FechaAdopcion', 'Fecha_Adopcion'])),
            observaciones: String(tomar(x, ['observaciones', 'Observaciones']) || '')
        };
    }

    async function cargar() {
        $('tbodyAdopciones').innerHTML = '<tr class="esq"><td><div style="width:28px"></div></td><td><div style="width:75%"></div></td><td><div style="width:65%"></div></td><td><div style="width:80%"></div></td><td><div style="width:75%"></div></td></tr>';
        try {
            var r = await llamar('GET', API);
            if (r.ok && Array.isArray(r.datos)) {
                lista = ordenar(r.datos.map(normalizar));
                if (seleccionado !== null && !lista.some(function (x) { return String(x.id) === String(seleccionado); })) {
                    seleccionado = null;
                    nroSeleccionado = null;
                    actualizarModo();
                }
                dibujar(); return;
            }
            errorTabla(mensajeError(r));
        } catch (e) { errorTabla('No hay conexión con el servidor. Verifica que la API esté en ejecución.'); }
    }

    function errorTabla(msg) {
        $('tbodyAdopciones').innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-plug-circle-xmark"></i><h3>No se pudo cargar la lista</h3><p>' + esc(msg) +
            '</p><button type="button" class="chip" id="btnReintentar"><i class="fa-solid fa-rotate-right"></i> Reintentar</button></div></td></tr>';
        if ($('btnReintentar')) $('btnReintentar').addEventListener('click', cargar);
    }

    function agregar() {
        if (ocupado) return;
        var d = leer(); if (!d) return;
        advertir('¿Agregar adopción?', 'Vas a registrar la adopción ' + describir(d) + '.',
            'Sí, agregar', 'principal', function () { ejecutarAgregar(d); });
    }

    async function ejecutarAgregar(d) {
        cargando(true);
        try {
            var r = await llamar('POST', API, d);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Adopción registrada!', 'La adopción del gato ' + d.nombreGato + ' se registró con éxito.');
                await cargar();
            } else {
                modal('error', 'No se pudo registrar', mensajeError(r));
            }
        } catch (e) { sinConexion(); }
        cargando(false);
    }

    function modificar() {
        if (ocupado) return;
        if (seleccionado === null) { modal('warn', 'Selecciona una adopción', 'Elige una adopción de la tabla para modificarla.'); return; }
        var d = leer(); if (!d) return;
        var id = seleccionado;
        var nro = nroSeleccionado || nroCorrelativo(id);
        advertir('¿Modificar adopción?', 'Vas a modificar la adopción #' + nro + ': quedará como la adopción ' + describir(d) + '.',
            'Sí, modificar', 'principal', function () { ejecutarModificar(id, d); });
    }

    async function ejecutarModificar(id, d) {
        cargando(true);
        try {
            var r = await llamar('PUT', API + '/' + id, d);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Actualizado!', 'La adopción del gato ' + d.nombreGato + ' se modificó con éxito.');
                await cargar();
            } else {
                modal('error', 'No se pudo actualizar', mensajeError(r));
            }
        } catch (e) { sinConexion(); }
        cargando(false);
    }

    function eliminar() {
        if (ocupado) return;
        if (seleccionado === null) { modal('warn', 'Selecciona una adopción', 'Elige una adopción de la tabla para eliminarla.'); return; }
        var id = seleccionado;
        var nro = nroSeleccionado || nroCorrelativo(id);
        var r0 = lista.filter(function (x) { return String(x.id) === String(id); })[0] || {};
        advertir('¿Eliminar adopción?',
            'Vas a eliminar la adopción #' + nro + ' del adoptante ' + (r0.adoptante || '') + ' y gato ' + (r0.gato || '') + '. Esta acción no se puede deshacer.',
            'Sí, eliminar', 'peligro', function () { ejecutarEliminar(id, r0); });
    }

    async function ejecutarEliminar(id, r0) {
        cargando(true);
        try {
            var r = await llamar('DELETE', API + '/' + id);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Eliminado!', 'La adopción del gato ' + (r0.gato || '') + ' se eliminó con éxito.');
                await cargar();
            } else {
                modal('error', 'No se pudo eliminar', mensajeError(r));
            }
        } catch (e) { sinConexion(); }
        cargando(false);
    }

    $('formAdopcion').addEventListener('submit', function (e) { e.preventDefault(); if (!$('btnAgregar').disabled) agregar(); });
    $('btnModificar').addEventListener('click', modificar);
    $('btnEliminar').addEventListener('click', eliminar);
    $('btnLimpiar').addEventListener('click', function () { if (!ocupado) reiniciar(); });

    $('txtFecha').value = hoy();
    actualizarModo();
    cargar();
});
