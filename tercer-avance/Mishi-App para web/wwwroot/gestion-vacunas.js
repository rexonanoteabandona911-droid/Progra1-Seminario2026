// @ts-nocheck
// gestion-vacunas.js  ->  CRUD de Gato_Vacuna (usa Gatos y Vacunas), con confirmación antes de cada acción
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    var API = '/api/GatoVacuna';
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
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
    }
    function dias(f) {
        return f ? Math.round((new Date(f + 'T00:00:00') - new Date(hoy() + 'T00:00:00')) / 86400000) : null;
    }
    function textoSelect(id) {
        var s = $(id);
        return (s && s.selectedIndex >= 0 && s.options[s.selectedIndex]) ? s.options[s.selectedIndex].text : '';
    }

    function ordenar(arr) {
        return arr.sort(function (a, b) {
            var fa = a.fechaAplicacion || '';
            var fb = b.fechaAplicacion || '';
            if (fa !== fb) return fa < fb ? -1 : 1;

            var pa = a.proximaDosis || '9999-12-31';
            var pb = b.proximaDosis || '9999-12-31';
            if (pa !== pb) return pa < pb ? -1 : 1;

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
        if (r.status === 404) return 'No se encontró la ruta ' + API + ' (error 404). Verifica que GatoVacunaController esté en el proyecto y reinicia la API.';
        if (r.status === 405) return 'El servidor no permite esta operación (error 405).';
        if (r.texto && r.texto.length < 300 && r.texto.charAt(0) !== '<') return r.texto;
        return 'El servidor respondió con el error ' + r.status + '.';
    }

    var ICONOS = { ok: 'fa-circle-check', error: 'fa-circle-xmark', warn: 'fa-triangle-exclamation', info: 'fa-circle-question' };
    function cerrarModal() { $('modalOverlay').classList.remove('abierto'); }
    function modal(tipo, titulo, mensaje, botones) {
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
        $('modalOverlay').classList.add('abierto');
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
        if (e.key === 'Escape' && $('modalOverlay').classList.contains('abierto')) cerrarModal();
    });
    $('modalOverlay').addEventListener('click', function (e) {
        if (e.target === $('modalOverlay')) cerrarModal();
    });
    if ($('navToggle')) {
        $('navToggle').addEventListener('click', function () { $('navMenu').classList.toggle('abierto'); });
    }

    function llenar(selectId, ayudaId, datos, vacio) {
        var h = '<option value="">' + esc(vacio) + '</option>';
        datos.forEach(function (x) {
            h += '<option value="' + esc(tomar(x, ['id', 'Id'])) + '">' + esc(tomar(x, ['nombre', 'Nombre'])) + '</option>';
        });
        var actual = $(selectId).value;
        $(selectId).innerHTML = h;
        $(selectId).value = actual;
        $(ayudaId).classList.toggle('visible', datos.length === 0);
        if (datos.length === 0) $(ayudaId).textContent = 'No hay registros en esta tabla. Agrégalos primero.';
    }

    async function cargarListas() {
        async function pedir(ruta, selectId, ayudaId, vacio) {
            try {
                var r = await llamar('GET', API + ruta);
                if (r.ok && Array.isArray(r.datos)) {
                    llenar(selectId, ayudaId, r.datos, vacio);
                    return;
                }
                $(selectId).innerHTML = '<option value="">No se pudo cargar</option>';
                $(ayudaId).textContent = mensajeError(r);
                $(ayudaId).classList.add('visible');
            } catch (e) {
                $(selectId).innerHTML = '<option value="">Sin conexión</option>';
                $(ayudaId).textContent = 'No hay conexión con el servidor.';
                $(ayudaId).classList.add('visible');
            }
        }
        await Promise.all([
            pedir('/gatos', 'selGato', 'ayudaGato', 'Selecciona el gato'),
            pedir('/vacunas', 'selVacuna', 'ayudaVacuna', 'Selecciona la vacuna')
        ]);
    }

    var GRUPOS = ['grpGato', 'grpVacuna', 'grpFecha', 'grpProxima'];
    function marcar(g, invalido) {
        var c = $(g);
        if (!c) return;
        c.classList.remove('invalido');
        if (invalido) {
            void c.offsetWidth;
            c.classList.add('invalido');
        }
    }
    if ($('selGato')) $('selGato').addEventListener('input', function () { marcar('grpGato', false); });
    if ($('selVacuna')) $('selVacuna').addEventListener('input', function () { marcar('grpVacuna', false); });
    if ($('txtFecha')) $('txtFecha').addEventListener('input', function () { marcar('grpFecha', false); marcar('grpProxima', false); });
    if ($('txtProxima')) $('txtProxima').addEventListener('input', function () { marcar('grpProxima', false); });

    function actualizarModo() {
        var ed = seleccionado !== null;
        $('badgeModo').className = 'modo' + (ed ? ' editando' : '');
        $('txtModo').textContent = ed ? 'Editando registro #' + nroCorrelativo(seleccionado) : 'Nuevo registro';
        $('btnAgregar').disabled = ed;
        $('btnModificar').disabled = !ed;
        $('btnEliminar').disabled = !ed;
    }

    function cargando(si) {
        ocupado = si;
        $('btnAgregar').classList.toggle('cargando', si);
        if (si) {
            $('btnAgregar').disabled = true;
            $('btnModificar').disabled = true;
            $('btnEliminar').disabled = true;
        } else {
            actualizarModo();
        }
    }

    function reiniciar() {
        seleccionado = null;
        if ($('txtId')) $('txtId').value = '';
        if ($('selGato')) $('selGato').value = '';
        if ($('selVacuna')) $('selVacuna').value = '';
        if ($('txtFecha')) $('txtFecha').value = hoy();
        if ($('txtProxima')) $('txtProxima').value = '';
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo();
        dibujar();
    }

    function seleccionar(id) {
        var r = lista.filter(function (x) { return String(x.id) === String(id); })[0];
        if (!r) return;
        seleccionado = r.id;
        if ($('txtId')) $('txtId').value = nroCorrelativo(r.id);
        if ($('selGato')) $('selGato').value = r.idGato;
        if ($('selVacuna')) $('selVacuna').value = r.idVacuna;
        if ($('txtFecha')) $('txtFecha').value = r.fechaAplicacion;
        if ($('txtProxima')) $('txtProxima').value = r.proximaDosis;
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo();
        dibujar();
        if (window.innerWidth <= 1050 && $('formVacuna')) {
            $('formVacuna').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function leer() {
        var v = {
            idGato: $('selGato').value,
            idVacuna: $('selVacuna').value,
            fecha: $('txtFecha').value,
            proxima: $('txtProxima').value
        };
        var malGato = !v.idGato, malVac = !v.idVacuna, malFecha = !v.fecha, malProx = false;
        $('errFecha').textContent = 'Selecciona la fecha de aplicación.';
        if (v.fecha && v.fecha > hoy()) {
            malFecha = true;
            $('errFecha').textContent = 'La fecha de aplicación no puede ser futura.';
        }
        if (v.proxima && v.fecha && v.proxima <= v.fecha) malProx = true;
        marcar('grpGato', malGato);
        marcar('grpVacuna', malVac);
        marcar('grpFecha', malFecha);
        marcar('grpProxima', malProx);
        if (malGato || malVac || malFecha || malProx) return null;

        var rep = lista.some(function (r) {
            return String(r.id) !== String(seleccionado === null ? '' : seleccionado) &&
                String(r.idGato) === String(v.idGato) &&
                String(r.idVacuna) === String(v.idVacuna) &&
                r.fechaAplicacion === v.fecha;
        });
        if (rep) {
            modal('warn', 'Registro duplicado', 'Ese gato ya tiene registrada esa vacuna en esa fecha.');
            return null;
        }
        return {
            idGato: +v.idGato,
            idVacuna: +v.idVacuna,
            fechaAplicacion: v.fecha,
            proximaDosis: v.proxima || null
        };
    }

    function describir(d, gato, vacuna) {
        return 'la vacuna ' + vacuna + ' del gato ' + gato + ', aplicada el ' + bonita(d.fechaAplicacion) +
            (d.proximaDosis ? ' y con próxima dosis el ' + bonita(d.proximaDosis) : ' (sin próxima dosis)');
    }

    function coincide(f, r) {
        var d = dias(r.proximaDosis);
        if (f === 'proximas') return d !== null && d >= 0 && d <= 30;
        if (f === 'vencidas') return d !== null && d < 0;
        return true;
    }

    function pajar(r) {
        return norm(['#' + r.id, r.gato, r.vacuna, bonita(r.fechaAplicacion), r.fechaAplicacion, bonita(r.proximaDosis), r.proximaDosis].join(' '));
    }

    function numeroDosis(r) {
        return lista.filter(function (x) {
            return String(x.idGato) === String(r.idGato) &&
                String(x.idVacuna) === String(r.idVacuna) &&
                (x.fechaAplicacion < r.fechaAplicacion || (x.fechaAplicacion === r.fechaAplicacion && Number(x.id) <= Number(r.id)));
        }).length;
    }

    function dibujar() {
        var tbody = $('tbodyVacunas');
        var buscado = $('txtBuscar').value;
        var palabras = norm(buscado).split(/\s+/).filter(Boolean);
        $('btnBorrarBusqueda').classList.toggle('visible', buscado.length > 0);
        $('statTotal').textContent = lista.length;
        $('statProx').textContent = lista.filter(function (r) { return coincide('proximas', r); }).length;
        $('statVenc').textContent = lista.filter(function (r) { return coincide('vencidas', r); }).length;

        var f = lista.filter(function (r) {
            if (!coincide(filtro, r)) return false;
            var p = pajar(r);
            return palabras.every(function (w) { return p.indexOf(w) !== -1; });
        });
        $('lblCantMostrada').textContent = f.length;

        if (!f.length) {
            var titulo, detalle;
            if (!lista.length) {
                titulo = 'Aún no hay vacunas registradas';
                detalle = 'Registra la primera vacuna con el formulario.';
            } else if (palabras.length) {
                titulo = 'Sin resultados para "' + buscado.trim() + '"';
                detalle = 'Prueba con otro nombre de gato, vacuna o fecha, o cambia el filtro.';
            } else if (filtro === 'proximas') {
                titulo = 'No hay dosis próximas';
                detalle = 'Ninguna dosis vence en los próximos 30 días.';
            } else if (filtro === 'vencidas') {
                titulo = 'No hay dosis vencidas';
                detalle = 'Todas las próximas dosis están al día.';
            } else {
                titulo = 'Sin coincidencias';
                detalle = 'Prueba con otra búsqueda o cambia el filtro.';
            }
            tbody.innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-syringe"></i><h3>' + esc(titulo) + '</h3><p>' + esc(detalle) + '</p></div></td></tr>';
            return;
        }

        var h = '';
        f.forEach(function (r, i) {
            var sel = seleccionado !== null && String(seleccionado) === String(r.id);
            var nroOrden = i + 1;
            var d = dias(r.proximaDosis), prox;
            if (d === null) prox = '<span class="nd">Sin próxima dosis</span>';
            else if (d < 0) prox = '<span class="estado venc"><i class="fa-solid fa-triangle-exclamation"></i> Vencida · ' + bonita(r.proximaDosis) + '</span>';
            else if (d <= 30) prox = '<span class="estado prox"><i class="fa-solid fa-clock"></i> ' + bonita(r.proximaDosis) + '</span>';
            else prox = '<span class="suave">' + bonita(r.proximaDosis) + '</span>';

            h += '<tr class="fila' + (sel ? ' sel' : '') + '" data-id="' + esc(r.id) + '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms">' +
                '<td class="id-num">#' + esc(nroOrden) + '</td>' +
                '<td><div class="celda-usuario"><span class="av">' + esc((r.gato || '?').charAt(0).toUpperCase()) + '</span><b>' + esc(r.gato || ('Gato #' + r.idGato)) + '</b></div></td>' +
                '<td><span class="etq"><i class="fa-solid fa-syringe"></i> ' + esc(r.vacuna || ('Vacuna #' + r.idVacuna)) + '</span><small class="desc">Dosis nº ' + numeroDosis(r) + '</small></td>' +
                '<td class="suave">' + bonita(r.fechaAplicacion) + '</td>' +
                '<td>' + prox + '</td></tr>';
        });
        tbody.innerHTML = h;
    }

    $('tbodyVacunas').addEventListener('click', function (e) {
        var f = e.target.closest('tr.fila');
        if (f) seleccionar(f.getAttribute('data-id'));
    });
    $('txtBuscar').addEventListener('input', dibujar);
    $('btnBorrarBusqueda').addEventListener('click', function () {
        $('txtBuscar').value = '';
        dibujar();
        $('txtBuscar').focus();
    });

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
            id: tomar(x, ['id', 'Id', 'id_gato_vacuna']),
            idGato: tomar(x, ['idGato', 'IdGato', 'id_gato']),
            gato: tomar(x, ['gato', 'Gato']),
            idVacuna: tomar(x, ['idVacuna', 'IdVacuna', 'id_vacuna']),
            vacuna: tomar(x, ['vacuna', 'Vacuna']),
            fechaAplicacion: sinHora(tomar(x, ['fechaAplicacion', 'FechaAplicacion', 'Fecha_Aplicacion'])),
            proximaDosis: sinHora(tomar(x, ['proximaDosis', 'ProximaDosis', 'Proxima_Dosis']))
        };
    }

    async function cargar() {
        $('tbodyVacunas').innerHTML = '<tr class="esq"><td><div style="width:30px"></div></td><td><div style="width:70%"></div></td><td><div style="width:70%"></div></td><td><div style="width:60%"></div></td><td><div style="width:60%"></div></td></tr>';
        try {
            var r = await llamar('GET', API);
            if (r.ok && Array.isArray(r.datos)) {
                lista = ordenar(r.datos.map(normalizar));
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
        $('tbodyVacunas').innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-plug-circle-xmark"></i><h3>No se pudo cargar la lista</h3><p>' + esc(msg) +
            '</p><button type="button" class="chip" id="btnReintentar"><i class="fa-solid fa-rotate-right"></i> Reintentar</button></div></td></tr>';
        if ($('btnReintentar')) $('btnReintentar').addEventListener('click', function () { cargarListas().then(cargar); });
    }

    function agregar() {
        if (ocupado) return;
        var d = leer();
        if (!d) return;
        var gato = textoSelect('selGato'), vacuna = textoSelect('selVacuna');
        confirmar('info', '¿Agregar vacuna?', 'Vas a registrar ' + describir(d, gato, vacuna) + '.',
            'Sí, agregar', 'principal', function () { ejecutarAgregar(d, gato, vacuna); });
    }

    async function ejecutarAgregar(d, gato, vacuna) {
        cargando(true);
        try {
            var r = await llamar('POST', API, d);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Vacuna registrada!', 'La vacuna ' + vacuna + ' de ' + gato + ' se registró con éxito.');
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
            modal('warn', 'Selecciona un registro', 'Elige un registro de la tabla para modificarlo.');
            return;
        }
        var d = leer();
        if (!d) return;
        var id = seleccionado, nro = nroCorrelativo(id), gato = textoSelect('selGato'), vacuna = textoSelect('selVacuna');
        confirmar('info', '¿Modificar registro?', 'Vas a modificar el registro #' + nro + ': quedará ' + describir(d, gato, vacuna) + '.',
            'Sí, modificar', 'principal', function () { ejecutarModificar(id, d, gato, vacuna); });
    }

    async function ejecutarModificar(id, d, gato, vacuna) {
        cargando(true);
        try {
            var r = await llamar('PUT', API + '/' + id, d);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Actualizado!', 'El registro de la vacuna ' + vacuna + ' de ' + gato + ' se modificó con éxito.');
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
            modal('warn', 'Selecciona un registro', 'Elige un registro de la tabla para eliminarlo.');
            return;
        }
        var id = seleccionado;
        var r0 = lista.filter(function (x) { return String(x.id) === String(id); })[0] || {};
        confirmar('warn', '¿Eliminar registro?',
            'Vas a eliminar la vacuna ' + (r0.vacuna || '') + ' del gato ' + (r0.gato || '') + ' (aplicada el ' + bonita(r0.fechaAplicacion) + '). Esta acción no se puede deshacer.',
            'Sí, eliminar', 'peligro', function () { ejecutarEliminar(id, r0); });
    }

    async function ejecutarEliminar(id, r0) {
        cargando(true);
        try {
            var r = await llamar('DELETE', API + '/' + id);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Eliminado!', 'La vacuna ' + (r0.vacuna || '') + ' de ' + (r0.gato || '') + ' se eliminó con éxito.');
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
            ? 'Dejarás de editar el registro #' + nroCorrelativo(seleccionado) + ' y se vaciarán todos los campos del formulario.'
            : 'Se borrarán los datos que escribiste en el formulario.';
        confirmar('info', '¿Limpiar formulario?', msg, 'Sí, limpiar', 'principal', reiniciar);
    }

    $('formVacuna').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!$('btnAgregar').disabled) agregar();
    });
    $('btnModificar').addEventListener('click', modificar);
    $('btnEliminar').addEventListener('click', eliminar);
    $('btnLimpiar').addEventListener('click', limpiar);

    $('txtFecha').value = hoy();
    actualizarModo();
    cargarListas().then(cargar);
});