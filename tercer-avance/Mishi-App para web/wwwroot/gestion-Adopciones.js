// @ts-nocheck
// gestion-Adopciones.js -> CRUD de Adopciones (/api/gestion-adopciones), con búsqueda, filtros y confirmación antes de cada acción
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    var API = '/api/gestion-adopciones';
    var $ = function (id) { return document.getElementById(id); };

    var lista = [];
    var seleccionado = null;
    var filtro = 'todos';
    var ocupado = false;

    function esc(t) {
        var d = document.createElement('div');
        d.textContent = t == null ? '' : t;
        return d.innerHTML.replace(/"/g, '&quot;');
    }
    function norm(t) {
        return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }
    function tomar(o, claves) {
        if (!o || typeof o !== 'object') return '';
        for (var i = 0; i < claves.length; i++) {
            var v = o[claves[i]];
            if (v !== undefined && v !== null) return v;
        }
        return '';
    }
    function hoy() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    function sinHora(v) {
        return v ? String(v).substring(0, 10) : '';
    }
    function bonita(iso) {
        var p = String(iso || '').split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : (iso || '');
    }
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
        if (cuerpo !== undefined) {
            op.headers['Content-Type'] = 'application/json';
            op.body = JSON.stringify(cuerpo);
        }
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
            if (d.errors) {
                var m = [];
                Object.keys(d.errors).forEach(function (k) { m.push([].concat(d.errors[k]).join(' ')); });
                if (m.length) return m.join(' ');
            }
            if (d.title) return d.title + ' (error ' + r.status + ')';
        }
        if (r.status === 404) return 'No se encontró la ruta ' + API + ' (error 404). Verifica que AdopcionesGestionController esté en el proyecto y reinicia la API.';
        if (r.status === 405) return 'El servidor no permite esta operación (error 405).';
        if (r.texto && r.texto.length < 300 && r.texto.charAt(0) !== '<') return r.texto;
        return 'El servidor respondió con el error ' + r.status + '.';
    }

    var ICONOS = { ok: 'fa-circle-check', error: 'fa-circle-xmark', warn: 'fa-triangle-exclamation', info: 'fa-circle-question' };
    function cerrarModal() {
        var ov = $('modalOverlay');
        if (ov) ov.classList.remove('abierto');
    }
    function modal(tipo, titulo, mensaje, botones) {
        var ov = $('modalOverlay');
        if (!ov) return;
        $('modalCaja').className = 'modal ' + tipo;
        $('modalIcono').className = 'fa-solid ' + ICONOS[tipo];
        $('modalTitulo').textContent = titulo;
        $('modalMensaje').textContent = mensaje;
        var cont = $('modalBotones');
        cont.innerHTML = '';
        (botones || [{ texto: 'Aceptar', clase: 'principal', accion: cerrarModal }]).forEach(function (b) {
            var el = document.createElement('button');
            el.type = 'button';
            el.textContent = b.texto;
            if (b.clase) el.className = b.clase;
            el.addEventListener('click', b.accion);
            cont.appendChild(el);
        });
        ov.classList.add('abierto');
        var p = cont.querySelector('.principal') || cont.querySelector('.peligro') || cont.querySelector('button');
        if (p) p.focus();
    }
    function confirmar(tipo, titulo, mensaje, textoSi, claseSi, accion) {
        modal(tipo, titulo, mensaje, [
            { texto: 'Cancelar', accion: cerrarModal },
            { texto: textoSi, clase: claseSi, accion: function () { cerrarModal(); accion(); } }
        ]);
    }
    function sinConexion() {
        modal('error', 'Sin conexión', 'No se pudo conectar con el servidor. Verifica que la API esté en ejecución.');
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && $('modalOverlay') && $('modalOverlay').classList.contains('abierto')) cerrarModal();
    });
    if ($('modalOverlay')) {
        $('modalOverlay').addEventListener('click', function (e) {
            if (e.target === $('modalOverlay')) cerrarModal();
        });
    }
    if ($('navToggle') && $('navMenu')) {
        $('navToggle').addEventListener('click', function () { $('navMenu').classList.toggle('abierto'); });
    }

    function poblarSolicitudes(items) {
        var sel = $('selSolicitud');
        if (!sel) return;
        var valorPrevio = sel.value || '';
        var vistos = {};
        var opciones = [{ val: '', txt: 'Registro directo (sin solicitud)' }];

        if (Array.isArray(items)) {
            items.forEach(function (it) {
                var val = String(tomar(it, ['id', 'Id', 'id_solicitud', 'IdSolicitud']) || '').trim();
                var txt = String(tomar(it, ['texto', 'Texto', 'label', 'Label']) || '').trim();
                if (val && !vistos[val]) {
                    vistos[val] = true;
                    opciones.push({ val: val, txt: txt || ('Solicitud #' + val) });
                }
            });
        }

        sel.innerHTML = opciones.map(function (o) {
            return '<option value="' + esc(o.val) + '">' + esc(o.txt) + '</option>';
        }).join('');

        if (valorPrevio && vistos[valorPrevio]) {
            sel.value = valorPrevio;
        } else {
            sel.value = '';
        }
    }

    async function cargarSolicitudes() {
        var sel = $('selSolicitud');
        if (!sel) return;
        poblarSolicitudes([]);
        try {
            var r = await llamar('GET', API + '/solicitudes');
            if (r.ok && Array.isArray(r.datos)) {
                poblarSolicitudes(r.datos);
            }
        } catch (e) {
            poblarSolicitudes([]);
        }
    }

    var GRUPOS = ['grpAdoptante', 'grpGato', 'grpFecha', 'grpSolicitud', 'grpObs'];
    function marcar(g, invalido) {
        var c = $(g);
        if (!c) return;
        c.classList.remove('invalido');
        if (invalido) {
            void c.offsetWidth;
            c.classList.add('invalido');
        }
    }

    function actualizarContadorObs() {
        var txtObs = $('txtObservaciones');
        var lblCont = $('lblContadorObs');
        if (!txtObs || !lblCont) return;
        var maxLen = txtObs.maxLength && txtObs.maxLength > 0 ? txtObs.maxLength : 300;
        lblCont.textContent = txtObs.value.length + ' / ' + maxLen;
    }

    if ($('txtAdoptante')) $('txtAdoptante').addEventListener('input', function () { marcar('grpAdoptante', false); });
    if ($('txtGato')) $('txtGato').addEventListener('input', function () { marcar('grpGato', false); });
    if ($('txtFecha')) $('txtFecha').addEventListener('input', function () { marcar('grpFecha', false); });
    if ($('selSolicitud')) $('selSolicitud').addEventListener('change', function () { marcar('grpSolicitud', false); });
    if ($('txtObservaciones')) {
        $('txtObservaciones').addEventListener('input', function () {
            marcar('grpObs', false);
            actualizarContadorObs();
        });
    }
    if ($('btnHoy')) {
        $('btnHoy').addEventListener('click', function () {
            if ($('txtFecha')) {
                $('txtFecha').value = hoy();
                marcar('grpFecha', false);
            }
        });
    }

    function actualizarModo() {
        var ed = seleccionado !== null;
        if ($('badgeModo')) $('badgeModo').className = 'modo' + (ed ? ' editando' : '');
        if ($('txtModo')) $('txtModo').textContent = ed ? 'Editando adopción #' + nroCorrelativo(seleccionado) : 'Nuevo registro';
        if ($('btnAgregar')) $('btnAgregar').disabled = ed;
        if ($('btnModificar')) $('btnModificar').disabled = !ed;
        if ($('btnEliminar')) $('btnEliminar').disabled = !ed;
    }

    function cargando(si) {
        ocupado = si;
        if ($('btnAgregar')) $('btnAgregar').classList.toggle('cargando', si);
        if (si) {
            if ($('btnAgregar')) $('btnAgregar').disabled = true;
            if ($('btnModificar')) $('btnModificar').disabled = true;
            if ($('btnEliminar')) $('btnEliminar').disabled = true;
        } else {
            actualizarModo();
        }
    }

    function reiniciar() {
        seleccionado = null;
        if ($('txtId')) $('txtId').value = '';
        if ($('txtAdoptante')) $('txtAdoptante').value = '';
        if ($('txtGato')) $('txtGato').value = '';
        if ($('txtFecha')) $('txtFecha').value = hoy();
        if ($('selSolicitud')) $('selSolicitud').value = '';
        if ($('txtObservaciones')) $('txtObservaciones').value = '';
        actualizarContadorObs();
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo();
        dibujar();
    }

    function seleccionar(id) {
        var r = lista.filter(function (x) { return String(x.id) === String(id); })[0];
        if (!r) return;
        seleccionado = r.id;
        if ($('txtId')) $('txtId').value = nroCorrelativo(r.id);
        if ($('txtAdoptante')) $('txtAdoptante').value = r.adoptante || '';
        if ($('txtGato')) $('txtGato').value = r.gato || '';
        if ($('txtFecha')) $('txtFecha').value = r.fecha || hoy();
        if ($('selSolicitud')) $('selSolicitud').value = r.idSolicitud != null ? String(r.idSolicitud) : '';
        if ($('txtObservaciones')) $('txtObservaciones').value = r.observaciones || '';
        actualizarContadorObs();
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo();
        dibujar();
        if (window.innerWidth <= 1050 && $('formAdopcion')) {
            $('formAdopcion').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function leer() {
        var adoptante = $('txtAdoptante') ? $('txtAdoptante').value.trim() : '';
        var gato = $('txtGato') ? $('txtGato').value.trim() : '';
        var fecha = $('txtFecha') ? $('txtFecha').value : '';
        var observaciones = $('txtObservaciones') ? $('txtObservaciones').value.trim() : '';
        var solRaw = $('selSolicitud') ? $('selSolicitud').value.trim() : '';
        var idSolicitud = solRaw !== '' && !isNaN(Number(solRaw)) ? parseInt(solRaw, 10) : null;

        var malAdoptante = !adoptante;
        var malGato = !gato;
        var malFecha = !fecha;

        marcar('grpAdoptante', malAdoptante);
        marcar('grpGato', malGato);
        marcar('grpFecha', malFecha);

        if (malAdoptante || malGato || malFecha) return null;

        return {
            nombre_Adoptante: adoptante,
            nombre_Gato: gato,
            fecha_Adopcion: fecha,
            id_solicitud: idSolicitud,
            observaciones: observaciones
        };
    }

    function describir(d) {
        var obsParte = d.observaciones ? ' — obs: "' + d.observaciones + '"' : '';
        return 'la adopción de ' + d.nombre_Gato + ' por ' + d.nombre_Adoptante +
            ' con fecha ' + bonita(d.fecha_Adopcion) + obsParte;
    }

    function esEsteMes(isoFecha) {
        if (!isoFecha) return false;
        var actual = hoy().substring(0, 7);
        return String(isoFecha).substring(0, 7) === actual;
    }

    function tieneObservaciones(r) {
        return String(r.observaciones || '').trim().length > 0;
    }

    function coincide(f, r) {
        if (f === 'mes') return esEsteMes(r.fecha);
        if (f === 'notas' || f === 'observaciones' || f === 'con_observaciones') return tieneObservaciones(r);
        return true;
    }

    function pajar(r) {
        return norm([
            '#' + r.id,
            r.adoptante,
            r.gato,
            bonita(r.fecha),
            r.fecha,
            r.observaciones
        ].join(' '));
    }

    function sincronizarFiltrosActivos() {
        document.querySelectorAll('[data-filtro]').forEach(function (x) {
            x.classList.toggle('activo', x.getAttribute('data-filtro') === filtro);
        });
    }

    function dibujar() {
        var tbody = $('tbodyAdopciones');
        if (!tbody) return;
        var buscado = $('txtBuscar') ? $('txtBuscar').value : '';
        var palabras = norm(buscado).split(/\s+/).filter(Boolean);
        if ($('btnBorrarBusqueda')) {
            $('btnBorrarBusqueda').classList.toggle('visible', buscado.length > 0);
        }

        var cantNotas = lista.filter(tieneObservaciones).length;
        if ($('statTotal')) $('statTotal').textContent = lista.length;
        if ($('statMes')) $('statMes').textContent = lista.filter(function (r) { return esEsteMes(r.fecha); }).length;
        if ($('statNotas')) $('statNotas').textContent = cantNotas;

        var f = lista.filter(function (r) {
            if (!coincide(filtro, r)) return false;
            var p = pajar(r);
            return palabras.every(function (w) { return p.indexOf(w) !== -1; });
        });
        if ($('lblCantMostrada')) $('lblCantMostrada').textContent = f.length;

        if (!f.length) {
            var titulo, detalle;
            if (!lista.length) {
                titulo = 'Aún no hay adopciones registradas';
                detalle = 'Registra la primera adopción utilizando el formulario.';
            } else if (palabras.length) {
                titulo = 'Sin resultados para "' + buscado.trim() + '"';
                detalle = 'Prueba con otro adoptante, gato, fecha u observación.';
            } else if (filtro === 'mes') {
                titulo = 'No hay adopciones este mes';
                detalle = 'No se registran adopciones en el mes actual.';
            } else if (filtro === 'notas' || filtro === 'observaciones' || filtro === 'con_observaciones') {
                titulo = 'No hay adopciones con observaciones';
                detalle = 'Ninguna adopción registrada tiene notas u observaciones.';
            } else {
                titulo = 'Sin coincidencias';
                detalle = 'Prueba con otra búsqueda o cambia el filtro.';
            }
            tbody.innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-heart"></i><h3>' + esc(titulo) + '</h3><p>' + esc(detalle) + '</p></div></td></tr>';
            return;
        }

        var h = '';
        f.forEach(function (r, i) {
            var sel = seleccionado !== null && String(seleccionado) === String(r.id);
            var nroOrden = i + 1;
            var obsTexto = String(r.observaciones || '').trim();
            var celdaObs = obsTexto
                ? '<span class="etq obs" title="' + esc(obsTexto) + '"><i class="fa-solid fa-comment-dots"></i><span>' + esc(obsTexto) + '</span></span>'
                : '<span class="suave">Sin observaciones</span>';

            h += '<tr class="fila' + (sel ? ' sel' : '') + '" data-id="' + esc(r.id) + '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms">' +
                '<td class="id-num">#' + esc(nroOrden) + '</td>' +
                '<td><div class="celda-usuario"><span class="av">' + esc((r.adoptante || '?').charAt(0).toUpperCase()) + '</span><b>' + esc(r.adoptante || 'Sin nombre') + '</b></div></td>' +
                '<td><span class="etq"><i class="fa-solid fa-cat"></i> ' + esc(r.gato || 'Sin gato') + '</span></td>' +
                '<td class="suave">' + esc(bonita(r.fecha)) + '</td>' +
                '<td>' + celdaObs + '</td></tr>';
        });
        tbody.innerHTML = h;
    }

    if ($('tbodyAdopciones')) {
        $('tbodyAdopciones').addEventListener('click', function (e) {
            var f = e.target.closest('tr.fila');
            if (f) seleccionar(f.getAttribute('data-id'));
        });
    }

    if ($('txtBuscar')) $('txtBuscar').addEventListener('input', dibujar);
    if ($('btnBorrarBusqueda')) {
        $('btnBorrarBusqueda').addEventListener('click', function () {
            $('txtBuscar').value = '';
            dibujar();
            $('txtBuscar').focus();
        });
    }

    var controles = document.querySelectorAll('[data-filtro]');
    controles.forEach(function (c) {
        c.addEventListener('click', function () {
            filtro = c.getAttribute('data-filtro');
            sincronizarFiltrosActivos();
            dibujar();
        });
    });

    function normalizarItem(x) {
        var obs = tomar(x, ['observaciones', 'Observaciones', 'nota', 'Nota']);
        if (obs && typeof obs === 'object') obs = tomar(obs, ['texto', 'Texto', 'descripcion', 'Descripcion']) || '';

        var adop = tomar(x, ['nombre_Adoptante', 'Nombre_Adoptante', 'adoptante', 'Adoptante', 'nombreAdoptante', 'NombreAdoptante', 'usuario', 'Usuario']);
        if (adop && typeof adop === 'object') adop = tomar(adop, ['nombre', 'Nombre']) || '';

        var gat = tomar(x, ['nombre_Gato', 'Nombre_Gato', 'gato', 'Gato', 'nombreGato', 'NombreGato']);
        if (gat && typeof gat === 'object') gat = tomar(gat, ['nombre', 'Nombre']) || '';

        return {
            id: tomar(x, ['id_adopcion', 'Id_Adopcion', 'id', 'Id', 'IdAdopcion']),
            idSolicitud: tomar(x, ['id_solicitud', 'Id_Solicitud', 'idSolicitud', 'IdSolicitud']),
            adoptante: String(adop || '').trim(),
            gato: String(gat || '').trim(),
            fecha: sinHora(tomar(x, ['fecha_Adopcion', 'Fecha_Adopcion', 'fecha', 'Fecha', 'fechaAdopcion', 'FechaAdopcion'])),
            observaciones: String(obs || '').trim()
        };
    }

    async function cargar() {
        var tbody = $('tbodyAdopciones');
        if (tbody) {
            tbody.innerHTML = '<tr class="esq"><td><div style="width:30px"></div></td><td><div style="width:70%"></div></td><td><div style="width:60%"></div></td><td><div style="width:55%"></div></td><td><div style="width:75%"></div></td></tr>';
        }
        try {
            var r = await llamar('GET', API);
            if (r.ok && Array.isArray(r.datos)) {
                lista = ordenar(r.datos.map(normalizarItem));
                if (seleccionado !== null && !lista.some(function (x) { return String(x.id) === String(seleccionado); })) {
                    seleccionado = null;
                    actualizarModo();
                }
                dibujar();
                return;
            }
            errorTabla(mensajeError(r));
        } catch (e) {
            errorTabla('No hay conexión con el servidor. Verifica que la API esté en ejecución.');
        }
    }

    function errorTabla(msg) {
        var tbody = $('tbodyAdopciones');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-plug-circle-xmark"></i><h3>No se pudo cargar la lista</h3><p>' + esc(msg) +
            '</p><button type="button" class="chip" id="btnReintentar"><i class="fa-solid fa-rotate-right"></i> Reintentar</button></div></td></tr>';
        if ($('btnReintentar')) $('btnReintentar').addEventListener('click', cargar);
    }

    function agregar() {
        if (ocupado) return;
        var d = leer();
        if (!d) return;
        confirmar('info', '¿Agregar adopción?', 'Vas a registrar ' + describir(d) + '.',
            'Sí, agregar', 'principal', function () { ejecutarAgregar(d); });
    }

    async function ejecutarAgregar(d) {
        cargando(true);
        try {
            var r = await llamar('POST', API, d);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Adopción registrada!', 'La adopción de ' + d.nombre_Gato + ' por ' + d.nombre_Adoptante + ' se registró con éxito.');
                await cargar();
            } else {
                console.error('POST falló:', r.status, r.texto);
                modal('error', 'No se pudo registrar', mensajeError(r));
            }
        } catch (e) {
            console.error(e);
            sinConexion();
        }
        cargando(false);
    }

    function modificar() {
        if (ocupado) return;
        if (seleccionado === null) {
            modal('warn', 'Selecciona un registro', 'Elige una adopción de la tabla para modificarla.');
            return;
        }
        var d = leer();
        if (!d) return;
        var id = seleccionado;
        confirmar('info', '¿Modificar adopción?', 'Vas a modificar el registro #' + nroCorrelativo(id) + ': quedará ' + describir(d) + '.',
            'Sí, modificar', 'principal', function () { ejecutarModificar(id, d); });
    }

    async function ejecutarModificar(id, d) {
        cargando(true);
        try {
            var r = await llamar('PUT', API + '/' + id, d);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Actualizada!', 'La adopción de ' + d.nombre_Gato + ' por ' + d.nombre_Adoptante + ' se modificó con éxito.');
                await cargar();
            } else {
                console.error('PUT falló:', r.status, r.texto);
                modal('error', 'No se pudo actualizar', mensajeError(r));
            }
        } catch (e) {
            console.error(e);
            sinConexion();
        }
        cargando(false);
    }

    function eliminar() {
        if (ocupado) return;
        if (seleccionado === null) {
            modal('warn', 'Selecciona un registro', 'Elige una adopción de la tabla para eliminarla.');
            return;
        }
        var id = seleccionado;
        var r0 = lista.filter(function (x) { return String(x.id) === String(id); })[0] || {};
        confirmar('warn', '¿Eliminar adopción?',
            'Vas a eliminar la adopción de ' + (r0.gato || 'este gatito') + ' por ' + (r0.adoptante || 'este adoptante') + '. Esta acción no se puede deshacer.',
            'Sí, eliminar', 'peligro', function () { ejecutarEliminar(id, r0); });
    }

    async function ejecutarEliminar(id, r0) {
        cargando(true);
        try {
            var r = await llamar('DELETE', API + '/' + id);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Eliminada!', 'La adopción de ' + (r0.gato || 'gatito') + ' se eliminó con éxito.');
                await cargar();
            } else {
                console.error('DELETE falló:', r.status, r.texto);
                modal('error', 'No se pudo eliminar', mensajeError(r));
            }
        } catch (e) {
            console.error(e);
            sinConexion();
        }
        cargando(false);
    }

    function limpiar() {
        if (ocupado) return;
        var msg = seleccionado !== null
            ? 'Dejarás de editar la adopción seleccionada y se vaciarán todos los campos del formulario.'
            : 'Se borrarán los datos que escribiste en el formulario.';
        confirmar('info', '¿Limpiar formulario?', msg, 'Sí, limpiar', 'principal', reiniciar);
    }

    if ($('formAdopcion')) {
        $('formAdopcion').addEventListener('submit', function (e) {
            e.preventDefault();
            if (!$('btnAgregar').disabled) agregar();
        });
    }
    if ($('btnModificar')) $('btnModificar').addEventListener('click', modificar);
    if ($('btnEliminar')) $('btnEliminar').addEventListener('click', eliminar);
    if ($('btnLimpiar')) $('btnLimpiar').addEventListener('click', limpiar);

    if ($('txtFecha') && !$('txtFecha').value) $('txtFecha').value = hoy();
    actualizarContadorObs();
    actualizarModo();
    cargarSolicitudes();
    cargar();
});