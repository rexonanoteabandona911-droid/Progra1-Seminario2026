// @ts-nocheck
// gestion-solicitudes.js -> CRUD de Solicitudes (/api/solicitudes), con búsqueda, filtros y confirmación antes de cada acción
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    var API = '/api/solicitudes';
    var $ = function (id) { return document.getElementById(id); };

    var GATOS_DISPONIBLES = [
        { nombre: 'Felipe', raza: 'Siamés' },
        { nombre: 'Pelusa', raza: 'Angora' },
        { nombre: 'Garfield', raza: 'Angora' },
        { nombre: 'Linda', raza: 'Persa' },
        { nombre: 'Luciana', raza: 'Mestizo' },
        { nombre: 'Minnie', raza: 'Mestizo' },
        { nombre: 'Sorbete', raza: 'Mestizo' },
        { nombre: 'Kimby', raza: 'Persa' },
        { nombre: 'Rubén', raza: 'Mestizo' },
        { nombre: 'Panchito', raza: 'Mestizo' },
        { nombre: 'Pantalones', raza: 'Mestizo' },
        { nombre: 'Linda', raza: 'Siamés' },
        { nombre: 'Capuchino', raza: 'Siamés' },
        { nombre: 'Despeinado', raza: 'Angora' },
        { nombre: 'Mishi', raza: 'Angora' },
        { nombre: 'Mandarino', raza: 'Mestizo' }
    ];

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
    function ordenar(arr) {
        return arr.sort(function (a, b) {
            return Number(a.id || 0) - Number(b.id || 0);
        });
    }

    function poblarSelectGatos() {
        var selGato = $('solGato');
        if (!selGato) return;

        var valorPrevio = selGato.value;
        selGato.innerHTML = '<option value="">Selecciona el gato</option>';

        GATOS_DISPONIBLES.forEach(function (g) {
            var opt = document.createElement('option');
            opt.value = g.nombre;
            opt.textContent = g.nombre + ' (' + g.raza + ')';
            selGato.appendChild(opt);
        });

        if (valorPrevio) {
            selGato.value = valorPrevio;
        }
    }

    function asegurarOpcionGato(nombreGato) {
        var selGato = $('solGato');
        if (!selGato || !nombreGato) return;

        var limpio = String(nombreGato).trim();
        var match = Array.from(selGato.options).find(function (opt) {
            return norm(opt.value) === norm(limpio);
        });

        if (match) {
            selGato.value = match.value;
        } else {
            var opt = document.createElement('option');
            opt.value = limpio;
            opt.textContent = limpio;
            selGato.appendChild(opt);
            selGato.value = limpio;
        }
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
        if (r.status === 404) return 'No se encontró la ruta ' + API + ' (error 404). Verifica que SolicitudesController esté en el proyecto y reinicia la API.';
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

    var GRUPOS = ['grpUsuario', 'grpGato', 'grpFecha', 'grpEstado'];
    function marcar(g, invalido) {
        var c = $(g);
        if (!c) return;
        c.classList.remove('invalido');
        if (invalido) {
            void c.offsetWidth;
            c.classList.add('invalido');
        }
    }
    $('solUsuario').addEventListener('input', function () { marcar('grpUsuario', false); });
    $('solGato').addEventListener('input', function () { marcar('grpGato', false); });
    $('solGato').addEventListener('change', function () { marcar('grpGato', false); });
    $('solFecha').addEventListener('input', function () { marcar('grpFecha', false); });
    $('solEstado').addEventListener('input', function () { marcar('grpEstado', false); });

    function actualizarModo() {
        var ed = seleccionado !== null;
        $('badgeModo').className = 'modo' + (ed ? ' editando' : '');
        $('txtModo').textContent = ed ? 'Editando solicitud #' + seleccionado : 'Nuevo registro';
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
        $('solId').value = '';
        $('solUsuario').value = '';
        $('solGato').value = '';
        $('solFecha').value = hoy();
        $('solEstado').value = 'Pendiente';
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo();
        dibujar();
    }

    function seleccionar(id) {
        var r = lista.filter(function (x) { return String(x.id) === String(id); })[0];
        if (!r) return;
        seleccionado = r.id;
        $('solId').value = r.id;
        $('solUsuario').value = r.usuario || '';
        asegurarOpcionGato(r.gato || '');
        $('solFecha').value = r.fecha || hoy();
        $('solEstado').value = r.estado || 'Pendiente';
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo();
        dibujar();
        if (window.innerWidth <= 1050 && $('formSolicitud')) {
            $('formSolicitud').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function leer() {
        var v = {
            usuario: $('solUsuario').value.trim(),
            gato: $('solGato').value.trim(),
            fecha: $('solFecha').value,
            estado: $('solEstado').value
        };

        var malUsuario = !v.usuario;
        var malGato = !v.gato;
        var malFecha = !v.fecha;
        var malEstado = !v.estado;

        if ($('errFecha')) {
            $('errFecha').textContent = 'Selecciona la fecha de la solicitud.';
        }
        marcar('grpUsuario', malUsuario);
        marcar('grpGato', malGato);
        marcar('grpFecha', malFecha);
        marcar('grpEstado', malEstado);

        if (malUsuario || malGato || malFecha || malEstado) return null;

        var rep = lista.some(function (r) {
            return String(r.id) !== String(seleccionado === null ? '' : seleccionado) &&
                norm(r.usuario) === norm(v.usuario) &&
                norm(r.gato) === norm(v.gato) &&
                norm(r.estado) === 'pendiente' &&
                norm(v.estado) === 'pendiente';
        });
        if (rep) {
            modal('warn', 'Solicitud duplicada', 'Esa persona ya tiene una solicitud pendiente para ese gatito.');
            return null;
        }

        return v;
    }

    function describir(d) {
        return 'la solicitud de ' + d.usuario + ' para adoptar a ' + d.gato +
            ' con fecha ' + bonita(d.fecha) + ' (estado: ' + d.estado + ')';
    }

    function coincide(f, r) {
        var est = norm(r.estado);
        if (f === 'pendiente') return est === 'pendiente';
        if (f === 'aprobada') return est === 'aprobada';
        if (f === 'rechazada') return est === 'rechazada';
        return true;
    }

    function pajar(r) {
        return norm(['#' + r.id, r.usuario, r.gato, bonita(r.fecha), r.fecha, r.estado].join(' '));
    }

    function badgeEstado(estado) {
        var est = norm(estado);
        if (est === 'aprobada') {
            return '<span class="estado apro"><i class="fa-solid fa-circle-check"></i> ' + esc(estado) + '</span>';
        }
        if (est === 'rechazada') {
            return '<span class="estado rech"><i class="fa-solid fa-circle-xmark"></i> ' + esc(estado) + '</span>';
        }
        return '<span class="estado pend"><i class="fa-solid fa-clock"></i> ' + esc(estado || 'Pendiente') + '</span>';
    }

    function dibujar() {
        var tbody = $('tbodySolicitudes');
        var buscado = $('txtBuscar').value;
        var palabras = norm(buscado).split(/\s+/).filter(Boolean);
        $('btnBorrarBusqueda').classList.toggle('visible', buscado.length > 0);

        $('statTotal').textContent = lista.length;
        $('statPend').textContent = lista.filter(function (r) { return coincide('pendiente', r); }).length;
        $('statApro').textContent = lista.filter(function (r) { return coincide('aprobada', r); }).length;
        $('statRech').textContent = lista.filter(function (r) { return coincide('rechazada', r); }).length;

        var f = lista.filter(function (r) {
            if (!coincide(filtro, r)) return false;
            var p = pajar(r);
            return palabras.every(function (w) { return p.indexOf(w) !== -1; });
        });
        $('lblCantMostrada').textContent = f.length;

        if (!f.length) {
            var titulo, detalle;
            if (!lista.length) {
                titulo = 'Aún no hay solicitudes registradas';
                detalle = 'Crea la primera solicitud utilizando el formulario.';
            } else if (palabras.length) {
                titulo = 'Sin resultados para "' + buscado.trim() + '"';
                detalle = 'Prueba con otro nombre de usuario, gato, estado o fecha.';
            } else if (filtro === 'pendiente') {
                titulo = 'No hay solicitudes pendientes';
                detalle = 'Todas las solicitudes ya fueron revisadas.';
            } else if (filtro === 'aprobada') {
                titulo = 'No hay solicitudes aprobadas';
                detalle = 'Aún no se ha aprobado ninguna solicitud.';
            } else if (filtro === 'rechazada') {
                titulo = 'No hay solicitudes rechazadas';
                detalle = 'No se registran solicitudes rechazadas.';
            } else {
                titulo = 'Sin coincidencias';
                detalle = 'Prueba con otra búsqueda o cambia el filtro.';
            }
            tbody.innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-file-lines"></i><h3>' + esc(titulo) + '</h3><p>' + esc(detalle) + '</p></div></td></tr>';
            return;
        }

        var h = '';
        f.forEach(function (r, i) {
            var sel = seleccionado !== null && String(seleccionado) === String(r.id);
            h += '<tr class="fila' + (sel ? ' sel' : '') + '" data-id="' + esc(r.id) + '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms">' +
                '<td class="id-num">#' + esc(r.id) + '</td>' +
                '<td><div class="celda-usuario"><span class="av">' + esc((r.usuario || '?').charAt(0).toUpperCase()) + '</span><b>' + esc(r.usuario || 'Sin nombre') + '</b></div></td>' +
                '<td><span class="etq"><i class="fa-solid fa-cat"></i> ' + esc(r.gato || 'Sin gato') + '</span></td>' +
                '<td class="suave">' + bonita(r.fecha) + '</td>' +
                '<td>' + badgeEstado(r.estado) + '</td></tr>';
        });
        tbody.innerHTML = h;
    }

    $('tbodySolicitudes').addEventListener('click', function (e) {
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
        var g = tomar(x, ['gato', 'Gato', 'nombreGato', 'NombreGato', 'gatoNombre', 'GatoNombre']);
        if (g && typeof g === 'object') {
            g = tomar(g, ['nombre', 'Nombre']) || '';
        }
        var u = tomar(x, ['usuario', 'Usuario', 'nombreUsuario', 'NombreUsuario', 'usuarioNombre', 'UsuarioNombre']);
        if (u && typeof u === 'object') {
            u = tomar(u, ['nombre', 'Nombre', 'nombre_Usuario', 'Nombre_Usuario']) || '';
        }
        return {
            id: tomar(x, ['id', 'Id']),
            usuario: String(u || '').trim(),
            gato: String(g || '').trim(),
            fecha: sinHora(tomar(x, ['fecha', 'Fecha'])),
            estado: tomar(x, ['estado', 'Estado']) || 'Pendiente'
        };
    }

    async function cargar() {
        $('tbodySolicitudes').innerHTML = '<tr class="esq"><td><div style="width:30px"></div></td><td><div style="width:70%"></div></td><td><div style="width:60%"></div></td><td><div style="width:60%"></div></td><td><div style="width:60%"></div></td></tr>';
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
        $('tbodySolicitudes').innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-plug-circle-xmark"></i><h3>No se pudo cargar la lista</h3><p>' + esc(msg) +
            '</p><button type="button" class="chip" id="btnReintentar"><i class="fa-solid fa-rotate-right"></i> Reintentar</button></div></td></tr>';
        if ($('btnReintentar')) $('btnReintentar').addEventListener('click', cargar);
    }

    function agregar() {
        if (ocupado) return;
        var d = leer();
        if (!d) return;
        confirmar('info', '¿Agregar solicitud?', 'Vas a registrar ' + describir(d) + '.',
            'Sí, agregar', 'principal', function () { ejecutarAgregar(d); });
    }

    async function ejecutarAgregar(d) {
        cargando(true);
        try {
            var r = await llamar('POST', API, d);
            if (r.ok) {
                var devuelto = normalizar(r.datos || {});
                var nombreGatoFinal = devuelto.gato || d.gato;
                var nombreUsuarioFinal = devuelto.usuario || d.usuario;
                reiniciar();
                modal('ok', '¡Solicitud registrada!', 'La solicitud de ' + nombreUsuarioFinal + ' para ' + nombreGatoFinal + ' se registró con éxito.');
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
            modal('warn', 'Selecciona un registro', 'Elige una solicitud de la tabla para modificarla.');
            return;
        }
        var d = leer();
        if (!d) return;
        var id = seleccionado;
        var cuerpo = { id: parseInt(id, 10), usuario: d.usuario, gato: d.gato, fecha: d.fecha, estado: d.estado };
        confirmar('info', '¿Modificar solicitud?', 'Vas a modificar la solicitud #' + id + ': quedará ' + describir(d) + '.',
            'Sí, modificar', 'principal', function () { ejecutarModificar(id, cuerpo); });
    }

    async function ejecutarModificar(id, cuerpo) {
        cargando(true);
        try {
            var r = await llamar('PUT', API + '/' + id, cuerpo);
            if (r.ok) {
                var devuelto = normalizar(r.datos || {});
                var nombreGatoFinal = devuelto.gato || cuerpo.gato;
                var nombreUsuarioFinal = devuelto.usuario || cuerpo.usuario;
                reiniciar();
                modal('ok', '¡Actualizada!', 'La solicitud de ' + nombreUsuarioFinal + ' para ' + nombreGatoFinal + ' se modificó con éxito.');
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
            modal('warn', 'Selecciona un registro', 'Elige una solicitud de la tabla para eliminarla.');
            return;
        }
        var id = seleccionado;
        var r0 = lista.filter(function (x) { return String(x.id) === String(id); })[0] || {};
        confirmar('warn', '¿Eliminar solicitud?',
            'Vas a eliminar la solicitud #' + id + ' de ' + (r0.usuario || '') + ' para el gato ' + (r0.gato || '') + '. Esta acción no se puede deshacer.',
            'Sí, eliminar', 'peligro', function () { ejecutarEliminar(id, r0); });
    }

    async function ejecutarEliminar(id, r0) {
        cargando(true);
        try {
            var r = await llamar('DELETE', API + '/' + id);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Eliminada!', 'La solicitud de ' + (r0.usuario || '') + ' para ' + (r0.gato || '') + ' se eliminó con éxito.');
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
            ? 'Dejarás de editar la solicitud #' + seleccionado + ' y se vaciarán todos los campos del formulario.'
            : 'Se borrarán los datos que escribiste en el formulario.';
        confirmar('info', '¿Limpiar formulario?', msg, 'Sí, limpiar', 'principal', reiniciar);
    }

    $('formSolicitud').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!$('btnAgregar').disabled) agregar();
    });
    $('btnModificar').addEventListener('click', modificar);
    $('btnEliminar').addEventListener('click', eliminar);
    $('btnLimpiar').addEventListener('click', limpiar);

    poblarSelectGatos();
    $('solFecha').value = hoy();
    actualizarModo();
    cargar();
});