// @ts-nocheck
// gestion-gatos.js -> CRUD de Gatos (/api/gatos), con selector de Razas, búsqueda, filtros y confirmación
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    var API = '/api/gatos';
    var API_RAZAS = '/api/gatos/razas';
    var $ = function (id) { return document.getElementById(id); };

    var lista = [];
    var razas = [];
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
    function ordenar(arr) {
        return arr.sort(function (a, b) {
            return Number(a.id || 0) - Number(b.id || 0);
        });
    }

    function calcularFechaDesdeEdad(edadAnios) {
        var anios = parseInt(edadAnios, 10);
        if (isNaN(anios) || anios < 0) return null;
        var fecha = new Date();
        fecha.setFullYear(fecha.getFullYear() - anios);
        return fecha.toISOString().split('T')[0];
    }

    function calcularEdadDesdeFecha(fechaNacimiento) {
        if (!fechaNacimiento) return null;
        var nac = new Date(fechaNacimiento);
        if (isNaN(nac.getTime())) return null;
        var hoy = new Date();
        var edad = hoy.getFullYear() - nac.getFullYear();
        var mesDiff = hoy.getMonth() - nac.getMonth();
        if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nac.getDate())) {
            edad--;
        }
        return edad >= 0 ? edad : null;
    }

    function obtenerEdadNumerica(gato) {
        var edadDirecta = tomar(gato, ['edad', 'Edad']);
        if (edadDirecta !== '') {
            var num = Number(edadDirecta);
            if (!isNaN(num)) return num;
        }
        var fechaNac = tomar(gato, ['fechaNacimiento', 'FechaNacimiento', 'Fecha_Nacimiento', 'fecha_nacimiento']);
        return calcularEdadDesdeFecha(fechaNac);
    }

    function obtenerNombreRaza(gato) {
        var r = tomar(gato, ['raza', 'Raza']);
        if (r && typeof r === 'object') {
            var n = tomar(r, ['nombre', 'Nombre']);
            if (n) return String(n).trim();
        }
        var directo = tomar(gato, ['nombreRaza', 'NombreRaza', 'nombre_raza']);
        if (directo) return String(directo).trim();
        if (typeof r === 'string' && r.trim()) return r.trim();

        var idRaza = tomar(gato, ['idRaza', 'IdRaza', 'id_raza', 'razaId', 'RazaId']);
        if (idRaza !== '' && razas.length) {
            var encontrada = razas.find(function (rz) { return String(rz.id) === String(idRaza); });
            if (encontrada && encontrada.nombre) return encontrada.nombre;
        }
        return '';
    }

    function formatearSexo(sexo) {
        if (!sexo) return '';
        var s = String(sexo).trim().toUpperCase();
        if (s === 'H' || s === 'HEMBRA') return 'Hembra';
        if (s === 'M' || s === 'MACHO') return 'Macho';
        return String(sexo).trim();
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
        if (r.status === 404) return 'No se encontró la ruta ' + API + ' (error 404). Verifica que GatosController esté en el proyecto y reinicia la API.';
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

    var GRUPOS = ['grpNombre', 'grpRaza', 'grpEdad', 'grpSexo', 'grpEstado'];
    function marcar(g, invalido) {
        var c = $(g);
        if (!c) return;
        c.classList.remove('invalido');
        if (invalido) {
            void c.offsetWidth;
            c.classList.add('invalido');
        }
    }
    $('catNombre').addEventListener('input', function () { marcar('grpNombre', false); });
    $('catRaza').addEventListener('change', function () { marcar('grpRaza', false); });
    $('catEdad').addEventListener('input', function () { marcar('grpEdad', false); });
    $('catSexo').addEventListener('change', function () { marcar('grpSexo', false); });
    $('catEstado').addEventListener('change', function () { marcar('grpEstado', false); });

    function poblarSelectRazas(valorActual) {
        var sel = $('catRaza');
        if (!sel) return;
        var prev = valorActual !== undefined ? String(valorActual) : sel.value;
        var html = '<option value="">No especificada</option>';
        razas.forEach(function (rz) {
            html += '<option value="' + esc(rz.id) + '">' + esc(rz.nombre) + '</option>';
        });
        sel.innerHTML = html;
        if (prev && Array.prototype.some.call(sel.options, function (o) { return o.value === prev; })) {
            sel.value = prev;
        } else {
            sel.value = '';
        }
    }

    async function cargarRazas() {
        try {
            var r = await llamar('GET', API_RAZAS);
            if (r.ok && Array.isArray(r.datos)) {
                razas = r.datos.map(function (x) {
                    return {
                        id: tomar(x, ['id', 'idRaza', 'IdRaza', 'id_raza']),
                        nombre: tomar(x, ['nombre', 'Nombre'])
                    };
                }).filter(function (x) { return x.id !== '' && x.nombre; });
                poblarSelectRazas();
                if (lista.length) {
                    lista = ordenar(lista.map(function (item) {
                        var rz = razas.find(function (z) { return String(z.id) === String(item.idRaza); });
                        var nom = rz ? rz.nombre : item.nombreRaza;
                        return Object.assign({}, item, {
                            nombreRaza: nom,
                            razaTexto: nom ? nom : (item.idRaza !== '' ? 'Raza #' + item.idRaza : 'No especificada')
                        });
                    }));
                    dibujar();
                }
            }
        } catch (e) {
            console.warn('No se pudieron cargar las razas:', e);
        }
    }

    function actualizarModo() {
        var ed = seleccionado !== null;
        $('badgeModo').className = 'modo' + (ed ? ' editando' : '');
        $('txtModo').textContent = ed ? 'Editando gatito #' + seleccionado : 'Nuevo registro';
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
        $('catId').value = '';
        $('catNombre').value = '';
        $('catRaza').value = '';
        $('catEdad').value = '';
        $('catSexo').value = '';
        $('catEstado').value = 'Disponible';
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo();
        dibujar();
    }

    function seleccionar(id) {
        var r = lista.filter(function (x) { return String(x.id) === String(id); })[0];
        if (!r) return;
        seleccionado = r.id;
        $('catId').value = r.id != null ? String(r.id) : '';
        $('catNombre').value = r.nombre || '';

        var idRazaStr = r.idRaza !== '' && r.idRaza !== null && r.idRaza !== undefined ? String(r.idRaza) : '';
        if (!idRazaStr && r.nombreRaza) {
            var match = razas.find(function (z) { return norm(z.nombre) === norm(r.nombreRaza); });
            if (match) idRazaStr = String(match.id);
        }
        poblarSelectRazas(idRazaStr);

        var edadValida = (r.edadNum !== null && r.edadNum !== undefined && r.edadNum !== '' && !isNaN(Number(r.edadNum)))
            ? String(Number(r.edadNum))
            : '';
        $('catEdad').value = edadValida;

        $('catSexo').value = formatearSexo(r.sexo);
        $('catEstado').value = r.estado || 'Disponible';
        GRUPOS.forEach(function (g) { marcar(g, false); });
        actualizarModo();
        dibujar();
        if (window.innerWidth <= 1050 && $('formGato')) {
            $('formGato').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function leer() {
        var nombre = $('catNombre').value.trim();
        var razaValor = $('catRaza').value.trim();
        var idRaza = razaValor !== '' && /^\d+$/.test(razaValor) ? parseInt(razaValor, 10) : null;
        var razaObj = idRaza !== null ? razas.find(function (z) { return Number(z.id) === idRaza; }) : null;
        var nombreRazaTexto = razaObj ? razaObj.nombre : '';

        var edadTexto = $('catEdad').value.trim();
        var sexo = $('catSexo').value || null;
        var estado = $('catEstado').value || 'Disponible';

        var malNombre = !nombre;
        var malEdad = false;
        var edadNum = null;

        if (edadTexto !== '') {
            var n = Number(edadTexto);
            if (!Number.isInteger(n) || n < 0 || n > 30) {
                malEdad = true;
            } else {
                edadNum = n;
            }
        }

        marcar('grpNombre', malNombre);
        marcar('grpEdad', malEdad);
        if (malNombre || malEdad) return null;

        var fechaNacimiento = edadNum !== null ? calcularFechaDesdeEdad(edadNum) : null;

        return {
            nombre: nombre,
            estado: estado,
            idRaza: idRaza,
            raza: idRaza,
            fechaNacimiento: fechaNacimiento,
            edad: edadNum,
            sexo: sexo,
            nombreRazaTexto: nombreRazaTexto
        };
    }

    function describir(d) {
        var edadDesc = d.edad !== null ? (d.edad === 1 ? '1 año' : d.edad + ' años') : 'edad no registrada';
        var razaDesc = d.nombreRazaTexto || 'raza no especificada';
        return 'al gatito ' + d.nombre + ' (' + razaDesc + ', ' + edadDesc + ', estado: ' + d.estado + ')';
    }

    function coincide(f, r) {
        var est = norm(r.estado);
        if (f === 'disponible') return est === 'disponible';
        if (f === 'adoptado') return est === 'adoptado';
        return true;
    }

    function pajar(r) {
        return norm(['#' + r.id, r.nombre, r.razaTexto, r.edadTexto, r.sexo, r.estado].join(' '));
    }

    function badgeEstado(estado) {
        var est = norm(estado);
        if (est === 'adoptado') {
            return '<span class="estado adop"><i class="fa-solid fa-house-chimney-heart"></i> ' + esc(estado) + '</span>';
        }
        return '<span class="estado disp"><i class="fa-solid fa-heart"></i> ' + esc(estado || 'Disponible') + '</span>';
    }

    function dibujar() {
        var tbody = $('tbodyGatos');
        var buscado = $('txtBuscar').value;
        var palabras = norm(buscado).split(/\s+/).filter(Boolean);
        $('btnBorrarBusqueda').classList.toggle('visible', buscado.length > 0);

        $('statTotal').textContent = lista.length;
        $('statDisp').textContent = lista.filter(function (r) { return coincide('disponible', r); }).length;
        $('statAdop').textContent = lista.filter(function (r) { return coincide('adoptado', r); }).length;

        var f = lista.filter(function (r) {
            if (!coincide(filtro, r)) return false;
            var p = pajar(r);
            return palabras.every(function (w) { return p.indexOf(w) !== -1; });
        });
        $('lblCantMostrada').textContent = f.length;

        if (!f.length) {
            var titulo, detalle;
            if (!lista.length) {
                titulo = 'Aún no hay gatitos registrados';
                detalle = 'Registra el primer gatito utilizando el formulario.';
            } else if (palabras.length) {
                titulo = 'Sin resultados para "' + buscado.trim() + '"';
                detalle = 'Prueba con otro nombre, raza, edad o estado.';
            } else if (filtro === 'disponible') {
                titulo = 'No hay gatitos disponibles';
                detalle = 'Todos los gatitos registrados aparecen como adoptados o en otro estado.';
            } else if (filtro === 'adoptado') {
                titulo = 'No hay gatitos adoptados';
                detalle = 'Aún no se registran adopciones completadas.';
            } else {
                titulo = 'Sin coincidencias';
                detalle = 'Prueba con otra búsqueda o cambia el filtro.';
            }
            tbody.innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-cat"></i><h3>' + esc(titulo) + '</h3><p>' + esc(detalle) + '</p></div></td></tr>';
            return;
        }

        var h = '';
        f.forEach(function (r, i) {
            var sel = seleccionado !== null && String(seleccionado) === String(r.id);
            var nroVisible = i + 1;
            h += '<tr class="fila' + (sel ? ' sel' : '') + '" data-id="' + esc(r.id) + '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms">' +
                '<td class="id-num">#' + esc(nroVisible) + '</td>' +
                '<td><div class="celda-usuario"><span class="av">' + esc((r.nombre || '?').charAt(0).toUpperCase()) + '</span><div><b>' + esc(r.nombre || 'Sin nombre') + '</b>' +
                (r.sexo ? '<small class="desc"><i class="fa-solid fa-venus-mars"></i> ' + esc(r.sexo) + '</small>' : '') + '</div></div></td>' +
                '<td><span class="etq"><i class="fa-solid fa-paw"></i> ' + esc(r.razaTexto) + '</span></td>' +
                '<td class="suave">' + esc(r.edadTexto) + '</td>' +
                '<td>' + badgeEstado(r.estado) + '</td></tr>';
        });
        tbody.innerHTML = h;
    }

    $('tbodyGatos').addEventListener('click', function (e) {
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

    function normalizarItem(x) {
        var edadNum = obtenerEdadNumerica(x);
        var nombreRaza = obtenerNombreRaza(x);
        var idRaza = tomar(x, ['idRaza', 'IdRaza', 'id_raza', 'razaId', 'RazaId']);
        var razaTexto = nombreRaza ? nombreRaza : (idRaza !== '' ? 'Raza #' + idRaza : 'No especificada');
        var edadTexto = edadNum === null || isNaN(edadNum) ? 'No registrada' : (edadNum === 1 ? '1 año' : edadNum + ' años');

        return {
            id: tomar(x, ['id', 'Id']),
            nombre: tomar(x, ['nombre', 'Nombre']) || 'Sin nombre',
            idRaza: idRaza,
            nombreRaza: nombreRaza || (idRaza !== '' ? 'Raza #' + idRaza : ''),
            razaTexto: razaTexto,
            edadNum: edadNum,
            edadTexto: edadTexto,
            sexo: formatearSexo(tomar(x, ['sexo', 'Sexo'])),
            estado: tomar(x, ['estado', 'Estado']) || 'Disponible'
        };
    }

    async function cargar() {
        $('tbodyGatos').innerHTML = '<tr class="esq"><td><div style="width:30px"></div></td><td><div style="width:70%"></div></td><td><div style="width:60%"></div></td><td><div style="width:50%"></div></td><td><div style="width:60%"></div></td></tr>';
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
        $('tbodyGatos').innerHTML = '<tr><td colspan="5"><div class="vacio"><i class="fa-solid fa-plug-circle-xmark"></i><h3>No se pudo cargar la lista</h3><p>' + esc(msg) +
            '</p><button type="button" class="chip" id="btnReintentar"><i class="fa-solid fa-rotate-right"></i> Reintentar</button></div></td></tr>';
        if ($('btnReintentar')) $('btnReintentar').addEventListener('click', cargar);
    }

    function agregar() {
        if (ocupado) return;
        var d = leer();
        if (!d) return;
        confirmar('info', '¿Agregar gatito?', 'Vas a registrar ' + describir(d) + '.',
            'Sí, agregar', 'principal', function () { ejecutarAgregar(d); });
    }

    async function ejecutarAgregar(d) {
        cargando(true);
        try {
            var cuerpo = {
                nombre: d.nombre,
                estado: d.estado,
                idRaza: d.idRaza,
                raza: d.raza,
                fechaNacimiento: d.fechaNacimiento,
                edad: d.edad,
                sexo: d.sexo
            };
            var r = await llamar('POST', API, cuerpo);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Gatito registrado!', 'El gatito ' + d.nombre + ' se registró con éxito.');
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
            modal('warn', 'Selecciona un registro', 'Elige un gatito de la tabla para modificarlo.');
            return;
        }
        var d = leer();
        if (!d) return;
        var id = seleccionado;
        var cuerpo = {
            id: parseInt(id, 10),
            nombre: d.nombre,
            estado: d.estado,
            idRaza: d.idRaza,
            raza: d.raza,
            fechaNacimiento: d.fechaNacimiento,
            edad: d.edad,
            sexo: d.sexo
        };
        confirmar('info', '¿Modificar gatito?', 'Vas a modificar el registro #' + id + ': quedará ' + describir(d) + '.',
            'Sí, modificar', 'principal', function () { ejecutarModificar(id, cuerpo, d); });
    }

    async function ejecutarModificar(id, cuerpo, d) {
        cargando(true);
        try {
            var r = await llamar('PUT', API + '/' + id, cuerpo);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Actualizado!', 'La información de ' + d.nombre + ' se modificó con éxito.');
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
            modal('warn', 'Selecciona un registro', 'Elige un gatito de la tabla para eliminarlo.');
            return;
        }
        var id = seleccionado;
        var r0 = lista.filter(function (x) { return String(x.id) === String(id); })[0] || {};
        confirmar('warn', '¿Eliminar gatito?',
            'Vas a eliminar el registro #' + id + ' de ' + (r0.nombre || 'este gatito') + '. Esta acción no se puede deshacer.',
            'Sí, eliminar', 'peligro', function () { ejecutarEliminar(id, r0); });
    }

    async function ejecutarEliminar(id, r0) {
        cargando(true);
        try {
            var r = await llamar('DELETE', API + '/' + id);
            if (r.ok) {
                reiniciar();
                modal('ok', '¡Eliminado!', 'El registro de ' + (r0.nombre || 'gatito') + ' se eliminó con éxito.');
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
            ? 'Dejarás de editar el gatito #' + seleccionado + ' y se vaciarán todos los campos del formulario.'
            : 'Se borrarán los datos que escribiste en el formulario.';
        confirmar('info', '¿Limpiar formulario?', msg, 'Sí, limpiar', 'principal', reiniciar);
    }

    $('formGato').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!$('btnAgregar').disabled) agregar();
    });
    $('btnModificar').addEventListener('click', modificar);
    $('btnEliminar').addEventListener('click', eliminar);
    $('btnLimpiar').addEventListener('click', limpiar);

    actualizarModo();
    cargarRazas().then(cargar);
});