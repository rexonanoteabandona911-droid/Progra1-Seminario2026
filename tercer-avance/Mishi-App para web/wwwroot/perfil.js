// @ts-nocheck
// perfil.js -> muestra y actualiza el perfil de quien inició sesión (usa GET /api/usuarios/{id} y PUT /api/usuarios/{id}/perfil)
document.addEventListener('DOMContentLoaded', function () {
    function $(id) { return document.getElementById(id); }
    function on(el, evento, fn) { if (el) el.addEventListener(evento, fn); }   
    var form = $('frmPerfil');
    var inId = $('perfilId');
    var inNombre = $('perfilNombre');
    var inCorreo = $('perfilCorreo');
    var inTelefono = $('perfilTelefono');
    var inClave = $('perfilClave');
    var inClaveActual = $('perfilClaveActual');
    var verClave = $('verClave');
    var btn = $('btnGuardar');
    var btnTexto = $('btnTexto');
    var overlay = $('overlay');
    var modal = $('modal');
    var estado = $('estado');
    var ESPERA_MS = 15000;  

    var ICONO_OK = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
    var ICONO_ERR = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    function ir(url) { window.location.href = url; }

    function leerUsuario() {
        try { return JSON.parse(localStorage.getItem('usuario')) || null; }
        catch (e) { return null; }
    }

    function setEstado(clase, texto) {
        estado.className = 'estado ' + clase;
        $('estadoTxt').textContent = texto;
    }

    function setCargando(si, texto) {
        btn.disabled = si;
        btn.classList.toggle('cargando', si);
        btnTexto.textContent = si ? texto : 'Guardar cambios';
    }

    function marcar(idCampo, invalido) {
        var c = $(idCampo);
        if (!c) return;
        c.classList.remove('invalido');
        if (invalido) { void c.offsetWidth; c.classList.add('invalido'); }
    }

    function cerrarSesion() {
        try { localStorage.removeItem('usuario'); } catch (e) { }
        ir('Login.html');
    }

    function cerrarModal() { overlay.classList.remove('abierto'); }

    function abrirModal(tipo, titulo, texto, botones) {
        modal.className = 'modal ' + tipo;
        $('modalIcono').innerHTML = tipo === 'ok' ? ICONO_OK : ICONO_ERR;
        $('modalTitulo').textContent = titulo;
        $('modalTexto').textContent = texto;

        var cont = $('modalBotones');
        cont.innerHTML = '';
        botones.forEach(function (b) {
            var el = document.createElement('button');
            el.type = 'button';
            el.textContent = b.texto;
            if (b.principal) el.className = 'principal';
            el.addEventListener('click', b.accion);
            cont.appendChild(el);
        });

        overlay.classList.add('abierto');
        var primero = cont.querySelector('button.principal') || cont.querySelector('button');
        if (primero) primero.focus();
    }
    on(document, 'keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('abierto')) cerrarModal();
    });

    function pedir(url, opciones) {
        var control = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var espera = setTimeout(function () { if (control) control.abort(); }, ESPERA_MS);
        opciones = opciones || {};
        if (control) opciones.signal = control.signal;
        return fetch(url, opciones).then(
            function (r) { clearTimeout(espera); return r; },
            function (e) { clearTimeout(espera); throw e; }
        );
    }

    function textoDeError(j, status) {
        var t = '';
        if (j && j.mensaje) t = j.mensaje;
        else if (j && j.errors) {
            var m = [];
            Object.keys(j.errors).forEach(function (k) { m.push([].concat(j.errors[k]).join(' ')); });
            t = m.join(' ');
        }
        else if (j && j.title) t = j.title;
        else t = 'Revisa tus datos e inténtalo de nuevo.';
        return t + ' (error ' + status + ')';
    }

    on($('navToggle'), 'click', function () { $('navMenu').classList.toggle('abierto'); });

    on(verClave, 'change', function () {
        var ver = verClave.checked;
        inClave.type = ver ? 'text' : 'password';
        inClaveActual.type = ver ? 'text' : 'password';
        $('iconoOjo').className = ver ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
        $('txtOjo').textContent = ver ? 'Ocultar contraseña' : 'Mostrar contraseña';
    });

    var avatar = $('avatar');
    on(avatar, 'click', function () {
        avatar.classList.remove('ronronea'); void avatar.offsetWidth; avatar.classList.add('ronronea');
    });

    on($('btnSalir'), 'click', cerrarSesion);
    on($('menuSalir'), 'click', function (e) {
        e.preventDefault();
        cerrarSesion();
    });

    on(inNombre, 'input', function () { marcar('campoNombre', false); });
    on(inCorreo, 'input', function () { marcar('campoCorreo', false); });
    on(inTelefono, 'input', function () { marcar('campoTelefono', false); });
    on(inClave, 'input', function () { marcar('campoClave', false); });
    on(inClaveActual, 'input', function () { marcar('campoClaveActual', false); });

    var usuario = leerUsuario();
    if (!usuario || !(usuario.id || usuario.Id)) { ir('Login.html'); return; }
    var id = usuario.id || usuario.Id;
    inId.value = id;

    var nombreGuardado = usuario.nombre || usuario.Nombre;
    if (nombreGuardado) $('titulo').textContent = 'Hola, ' + nombreGuardado;
    setCargando(true, 'Cargando...');
    pedir('/api/usuarios/' + id)
        .then(function (resp) {
            return resp.json().catch(function () { return null; }).then(function (data) {
                if (resp.ok && data) {
                    inNombre.value = data.nombre || '';
                    inCorreo.value = data.correo || '';
                    inTelefono.value = data.telefono || '';
                    $('rol').textContent = data.rol || '';
                    setEstado('listo', 'Perfil cargado');
                } else if (resp.status === 404 && data && data.mensaje === 'Usuario no encontrado') {
                    setEstado('nuevo', 'Tu cuenta ya no existe');
                    abrirModal('error', 'Tu cuenta ya no existe',
                        'No encontramos tu usuario en la base de datos. Inicia sesión con otra cuenta o crea una nueva.',
                        [{ texto: 'Ir al login', principal: true, accion: cerrarSesion }]);
                } else {
                    console.error('Perfil: no se pudo cargar', resp.status, data);
                    setEstado('nuevo', 'No se pudo cargar tu perfil (error ' + resp.status + ')');
                }
            });
        })
        .catch(function (err) {
            console.error('Perfil: sin respuesta', err);
            setEstado('nuevo', err && err.name === 'AbortError' ? 'El servidor no responde' : 'Sin conexión con el servidor');
        })
        .then(function () { setCargando(false); });
    on(form, 'submit', function (e) {
        e.preventDefault();

        var nombre = inNombre.value.trim();
        var correo = inCorreo.value.trim();
        var telefono = inTelefono.value.trim();
        var claveNueva = inClave.value;          
        var claveActual = inClaveActual.value;

        var nombreMal = !nombre || nombre.length > 100;
        var correoMal = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 150;
        var telMal = telefono !== '' && !/^[0-9+\-\s()]{7,30}$/.test(telefono);
        var claveMal = claveNueva !== '' && (claveNueva.length < 4 || claveNueva.trim() === '');
        var actualMal = claveNueva !== '' && claveActual === '';
        marcar('campoNombre', nombreMal);
        marcar('campoCorreo', correoMal);
        marcar('campoTelefono', telMal);
        marcar('campoClave', claveMal);
        marcar('campoClaveActual', actualMal);
        if (nombreMal || correoMal || telMal || claveMal || actualMal) return;

        var datos = {
            nombre: nombre,
            correo: correo,
            telefono: telefono,
            claveActual: claveActual,
            claveNueva: claveNueva
        };

        setCargando(true, 'Guardando...');

        pedir('/api/usuarios/' + id + '/perfil', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        })
            .then(function (resp) {
                return resp.json().catch(function () { return {}; }).then(function (j) {
                    if (resp.ok) {
                        var actual = leerUsuario() || {};
                        actual.nombre = actual.Nombre = nombre;
                        actual.correo = actual.Correo = correo;
                        actual.telefono = telefono;
                        try { localStorage.setItem('usuario', JSON.stringify(actual)); } catch (x) { }

                        $('titulo').textContent = 'Hola, ' + nombre;
                        inClave.value = '';
                        inClaveActual.value = '';
                        setEstado('listo', 'Cambios guardados');
                        abrirModal('ok', '¡Cambios guardados!', 'Tu perfil se actualizó correctamente.', [
                            { texto: 'Seguir aquí', accion: cerrarModal },
                            { texto: 'Ir al catálogo', principal: true, accion: function () { ir('gatos.html'); } }
                        ]);
                    } else {
                        console.error('Perfil: no se pudo guardar', resp.status, j);
                        abrirModal('error', 'No se pudo guardar', textoDeError(j, resp.status),
                            [{ texto: 'Cerrar', principal: true, accion: cerrarModal }]);
                    }
                });
            })
            .catch(function (err) {
                console.error('Perfil: sin respuesta', err);
                var aborto = err && err.name === 'AbortError';
                abrirModal('error', aborto ? 'El servidor no responde' : 'Sin conexión',
                    aborto ? 'Pasaron ' + (ESPERA_MS / 1000) + ' segundos sin respuesta. Verifica que el proyecto esté en ejecución e inténtalo de nuevo.'
                        : 'No se pudo conectar con el servidor. Verifica que la API esté en ejecución.',
                    [{ texto: 'Cerrar', principal: true, accion: cerrarModal }]);
            })
            .then(function () { setCargando(false); });
    });
});