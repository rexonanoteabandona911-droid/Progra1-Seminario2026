// @ts-nocheck
document.addEventListener('DOMContentLoaded', function () {
    var GATOS_DETALLE = [
        {
            nombre: 'Felipe',
            raza: 'Siamés',
            img: 'img/felipe.png',
            personalidad: 'Muy cariñoso, le encanta la compañía humana, es sumamente curioso y le gusta jugar con juguetes interactivos.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Pelusa',
            raza: 'Angora',
            img: 'img/pelusa.png',
            personalidad: 'Tranquila, hogareña, disfruta de las siestas largas bajo el sol y es ideal para departamentos u hogares calmados.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Garfield',
            raza: 'Angora',
            img: 'img/garfield.png',
            personalidad: 'Divertido, comelón, amigable con otros animales y muy relajado ante la presencia de visitas.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Linda',
            raza: 'Persa',
            img: 'img/linda.png',
            personalidad: 'Elegante, noble, un poco tímida al principio pero extremadamente leal y dulce con su dueña.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Luciana',
            raza: 'Mestizo',
            img: 'img/luciana.png',
            personalidad: 'Tierna, atenta y muy agradecida, ideal para compartir momentos tranquilos en casa.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Minnie',
            raza: 'Mestizo',
            img: 'img/minnie.png',
            personalidad: 'Juguetona, dulce y sociable, siempre lista para explorar cada rincón.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Sorbete',
            raza: 'Mestizo',
            img: 'img/sorbete.png',
            personalidad: 'Simpático, curioso y cariñoso, se adapta rápido a nuevas rutinas.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Kimby',
            raza: 'Persa',
            img: 'img/kimby.png',
            personalidad: 'Serena, afectuosa y elegante, disfruta de la compañía cercana y los mimos.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Rubén',
            raza: 'Mestizo',
            img: 'img/Rúben.png',
            personalidad: 'Muy activo, juguetón, le fascina correr por la casa y escalar rascadores altos.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Panchito',
            raza: 'Mestizo',
            img: 'img/panchito.png',
            personalidad: 'Alegre, protector, sociable y siempre recibe a las personas con un tierno maullido.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Pantalones',
            raza: 'Mestizo',
            img: 'img/pantalones.png',
            personalidad: 'Dormilón, tierno, busca caricias constantemente y se acurruca por las noches.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Linda',
            raza: 'Siamés',
            img: 'img/linda.png',
            personalidad: 'Dulce, observadora y afectuosa, disfruta de la calma y la compañía cercana.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Capuchino',
            raza: 'Siamés',
            img: 'img/capuchino.png',
            personalidad: 'Inteligente, observador, vocaliza cuando quiere atención y aprende rápido dónde usar su arenero.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Despeinado',
            raza: 'Angora',
            img: 'img/despeinado.png',
            personalidad: 'Aventurero, travieso, con una melena única y gran energía para jugar todo el día.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Mishi',
            raza: 'Angora',
            img: 'img/mishi.png',
            personalidad: 'Dulce, hogareña, rescatada con mucho amor y lista para dar afecto incondicional.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        },
        {
            nombre: 'Mandarino',
            raza: 'Mestizo',
            img: 'img/mandarino.png',
            personalidad: 'Vibrante, carismático, color naranja brillante y un temperamento muy alegre.',
            vacunas: ['Triple Felina (Al día)', 'Rabia (Aplicada)', 'Desparasitado interna y externa']
        }
    ];

    var estado = { texto: '', raza: 'todas' };
    var favoritos = [];

    function normalizar(t) {
        return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    function escapar(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    function idGato(g) {
        return normalizar(g.nombre) + '-' + normalizar(g.raza);
    }

    function cargarFavoritos() {
        try { favoritos = JSON.parse(localStorage.getItem('gatosFavoritos')) || []; }
        catch (e) { favoritos = []; }
    }

    function guardarFavoritos() {
        try { localStorage.setItem('gatosFavoritos', JSON.stringify(favoritos)); } catch (e) { }
    }

    function crearTarjetas() {
        var grid = document.getElementById('grid');
        var html = '';

        GATOS_DETALLE.forEach(function (g, i) {
            var id = idGato(g);
            var esFav = favoritos.indexOf(id) !== -1;
            html +=
                '<article class="cat-card" style="--i:' + Math.min(i, 14) + '"' +
                ' data-index="' + i + '"' +
                ' data-id="' + id + '"' +
                ' data-nombre="' + escapar(normalizar(g.nombre)) + '"' +
                ' data-raza="' + escapar(normalizar(g.raza)) + '">' +
                '<button type="button" class="fav' + (esFav ? ' activo' : '') + '" aria-label="Marcar como favorito" title="Favorito">' +
                '<i class="fa-' + (esFav ? 'solid' : 'regular') + ' fa-heart"></i></button>' +
                '<div class="cat-image-wrapper"><img src="' + escapar(g.img) + '" alt="' + escapar(g.nombre) + '" loading="lazy"></div>' +
                '<div class="cat-info">' +
                '<span class="badge"><i class="fa-solid fa-paw"></i>' + escapar(g.raza) + '</span>' +
                '<h3>' + escapar(g.nombre) + '</h3>' +
                '</div>' +
                '<a href="adopcion.html" class="card-adopt">' +
                '<i class="fa-solid fa-heart"></i> Adopta</a>' +
                '</article>';
        });

        grid.innerHTML = html;
    }

    function crearFiltros() {
        var razas = [];
        GATOS_DETALLE.forEach(function (g) {
            if (razas.indexOf(g.raza) === -1) razas.push(g.raza);
        });

        var html = '<button type="button" class="chip activo" data-raza="todas"><i class="fa-solid fa-border-all"></i> Todos</button>';
        razas.forEach(function (r) {
            html += '<button type="button" class="chip" data-raza="' + escapar(normalizar(r)) + '">' + escapar(r) + '</button>';
        });
        html += '<button type="button" class="chip" data-raza="favoritos"><i class="fa-solid fa-heart"></i> Favoritos</button>';
        html += '<span class="contador" id="contador"></span>';

        document.getElementById('filtros').innerHTML = html;
    }

    function filtrarGatos() {
        var inputElem = document.getElementById('searchInput');
        if (!inputElem) return;

        estado.texto = normalizar(inputElem.value);
        document.getElementById('btnLimpiar').classList.toggle('visible', inputElem.value.length > 0);

        var cards = document.querySelectorAll('.cat-card');
        var visibles = 0;

        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var nombre = card.getAttribute('data-nombre') || '';
            var raza = card.getAttribute('data-raza') || '';
            var id = card.getAttribute('data-id');

            var coincideTexto = nombre.indexOf(estado.texto) !== -1 || raza.indexOf(estado.texto) !== -1;
            var coincideRaza = estado.raza === 'todas' ||
                (estado.raza === 'favoritos' ? favoritos.indexOf(id) !== -1 : raza === estado.raza);

            if (coincideTexto && coincideRaza) {
                card.style.display = 'flex';
                visibles++;
            } else {
                card.style.display = 'none';
            }
        }

        document.getElementById('contador').innerHTML =
            'Mostrando <b>' + visibles + '</b> de <b>' + cards.length + '</b> gatitos';

        var vacio = document.getElementById('vacio');
        vacio.classList.toggle('visible', visibles === 0);
        if (visibles === 0 && estado.raza === 'favoritos' && !estado.texto) {
            vacio.querySelector('h3').textContent = 'Aún no tienes favoritos';
            vacio.querySelector('p').textContent = 'Toca el corazón de un gatito para guardarlo aquí.';
        } else {
            vacio.querySelector('h3').textContent = 'No encontramos ese gatito';
            vacio.querySelector('p').textContent = 'Prueba con otro nombre o raza, o quita los filtros.';
        }
    }

    function seleccionarRaza(raza) {
        estado.raza = raza;
        var chips = document.querySelectorAll('#filtros .chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.toggle('activo', chips[i].getAttribute('data-raza') === raza);
        }
        filtrarGatos();
    }

    function reiniciar() {
        document.getElementById('searchInput').value = '';
        seleccionarRaza('todas');
    }

    var modal = document.getElementById('modalDetalle');
    var modalImg = document.getElementById('modalImg');
    var modalImageBox = document.getElementById('modalImageBox');
    var overlay = document.getElementById('vacunasOverlay');
    var tapHint = document.getElementById('tapHint');

    function abrirDetalleGato(gato) {
        if (!gato) return;

        overlay.classList.remove('visible');
        tapHint.innerHTML = '<i class="fa-solid fa-syringe"></i> Presiona la imagen para ver el registro de vacunas';

        document.getElementById('modalName').textContent = gato.nombre;
        document.getElementById('overlayCatName').textContent = gato.nombre;
        document.getElementById('modalBreed').innerHTML = '<i class="fa-solid fa-paw"></i> Raza: ' + escapar(gato.raza);
        document.getElementById('modalPersonality').textContent = gato.personalidad;
        document.getElementById('btnAdoptarModal').href = 'adopcion.html';

        modalImg.style.display = 'block';
        modalImg.alt = gato.nombre;
        modalImg.src = gato.img;

        var listaModal = document.getElementById('modalVaccines');
        var listaOverlay = document.getElementById('overlayVaccinesList');
        listaModal.innerHTML = '';
        listaOverlay.innerHTML = '';

        gato.vacunas.forEach(function (vacuna) {
            var li1 = document.createElement('li');
            li1.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + escapar(vacuna);
            listaModal.appendChild(li1);

            var li2 = document.createElement('li');
            li2.innerHTML = '<i class="fa-solid fa-syringe"></i> ' + escapar(vacuna);
            listaOverlay.appendChild(li2);
        });

        modal.classList.add('abierto');
        modal.setAttribute('aria-hidden', 'false');
    }

    function cerrarModal() {
        modal.classList.remove('abierto');
        modal.setAttribute('aria-hidden', 'true');
        overlay.classList.remove('visible');
    }

    function alternarVacunas() {
        var visible = overlay.classList.toggle('visible');
        tapHint.innerHTML = visible
            ? '<i class="fa-solid fa-xmark"></i> Presiona la imagen para ocultar el registro de vacunas'
            : '<i class="fa-solid fa-syringe"></i> Presiona la imagen para ver el registro de vacunas';
    }

    cargarFavoritos();
    crearTarjetas();
    crearFiltros();

    var buscador = document.getElementById('searchInput');
    buscador.addEventListener('input', filtrarGatos);
    buscador.addEventListener('keyup', filtrarGatos);

    document.getElementById('btnLimpiar').addEventListener('click', function () {
        buscador.value = '';
        filtrarGatos();
        buscador.focus();
    });

    document.getElementById('btnReset').addEventListener('click', reiniciar);

    document.getElementById('filtros').addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (chip) seleccionarRaza(chip.getAttribute('data-raza'));
    });

    document.getElementById('grid').addEventListener('click', function (e) {
        var botonFav = e.target.closest('.fav');
        if (botonFav) {
            e.stopPropagation();
            var cardFav = botonFav.closest('.cat-card');
            var id = cardFav.getAttribute('data-id');
            var pos = favoritos.indexOf(id);
            var activo = pos === -1;

            if (activo) favoritos.push(id); else favoritos.splice(pos, 1);
            guardarFavoritos();

            botonFav.classList.toggle('activo', activo);
            botonFav.querySelector('i').className = 'fa-' + (activo ? 'solid' : 'regular') + ' fa-heart';
            if (estado.raza === 'favoritos') filtrarGatos();
            return;
        }

        if (e.target.closest('.card-adopt')) {
            e.stopPropagation();
            return;
        }

        var cardClick = e.target.closest('.cat-card');
        if (cardClick) {
            var idx = parseInt(cardClick.getAttribute('data-index'), 10);
            abrirDetalleGato(GATOS_DETALLE[idx]);
        }
    });

    document.getElementById('grid').addEventListener('error', function (e) {
        if (e.target.tagName !== 'IMG') return;
        var marco = e.target.parentNode;
        marco.innerHTML = '<i class="fa-solid fa-paw sin-foto"></i>';
    }, true);

    modalImg.addEventListener('error', function () {
        modalImg.style.display = 'none';
    });

    modalImageBox.addEventListener('click', alternarVacunas);
    modalImageBox.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            alternarVacunas();
        }
    });

    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) cerrarModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('abierto')) cerrarModal();
    });

    var navToggle = document.getElementById('navToggle');
    var navMenu = document.getElementById('navMenu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function () {
            navMenu.classList.toggle('abierto');
        });
    }

    filtrarGatos();
});