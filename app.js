/* ============================================================
   GymStore — lógica de la tienda (sin servidor, usa localStorage)
   ============================================================ */
(function () {
  'use strict';

  const STORAGE = {
    categories: 'gym_categories',
    products: 'gym_products',
    users: 'gym_users',
    session: 'gym_session',
    cart: 'gym_cart',
    orders: 'gym_orders'
  };

  const ENVIO_FIJO = 2990;
  const ENVIO_GRATIS_DESDE = 60000;
  const ESTADOS = ['Preparando', 'En camino', 'Entregado'];

  const SEED = {
    categories: [
      { id: 'c-suplementos', nombre: 'Suplementos', descripcion: 'Proteínas, creatinas y más para tu rendimiento.' },
      { id: 'c-accesorios', nombre: 'Accesorios', descripcion: 'Equipamiento y accesorios de entrenamiento.' },
      { id: 'c-indumentaria', nombre: 'Indumentaria', descripcion: 'Ropa cómoda y resistente para el gimnasio.' }
    ],
    products: [
      { id: 'p1', nombre: 'Proteína Whey 1 kg', categoriaId: 'c-suplementos', precio: 45900, descripcion: 'Proteína de suero de leche, 24 g por porción. Ideal para recuperación muscular.', colores: [], talles: [], stock: 25, imagen: '', destacado: true },
      { id: 'p2', nombre: 'Creatina Monohidratada 300 g', categoriaId: 'c-suplementos', precio: 24500, descripcion: 'Creatina pura para aumentar fuerza y rendimiento en entrenamientos intensos.', colores: [], talles: [], stock: 40, imagen: '', destacado: true },
      { id: 'p3', nombre: 'BCAA 500 g', categoriaId: 'c-suplementos', precio: 32000, descripcion: 'Aminoácidos de cadena ramificada para reducir la fatiga durante el entrenamiento.', colores: [], talles: [], stock: 18, imagen: '', destacado: false },
      { id: 'p4', nombre: 'Guantes de entrenamiento', categoriaId: 'c-accesorios', precio: 12900, descripcion: 'Guantes con agarre antideslizante y protección para la palma.', colores: ['Negro', 'Gris', 'Azul'], talles: ['S', 'M', 'L'], stock: 30, imagen: '', destacado: true },
      { id: 'p5', nombre: 'Cinturón de levantamiento', categoriaId: 'c-accesorios', precio: 38000, descripcion: 'Cinturón rígido con cierre rápido para levantamientos pesados.', colores: ['Negro', 'Gris'], talles: ['M', 'L', 'XL'], stock: 12, imagen: '', destacado: false },
      { id: 'p6', nombre: 'Botella térmica 1 L', categoriaId: 'c-accesorios', precio: 15500, descripcion: 'Botella de acero inoxidable que mantiene tus bebidas frías por horas.', colores: ['Azul', 'Gris', 'Blanco'], talles: ['Única'], stock: 50, imagen: '', destacado: false },
      { id: 'p7', nombre: 'Remera de entrenamiento', categoriaId: 'c-indumentaria', precio: 19900, descripcion: 'Remera de secado rápido, liviana y con excelente ventilación.', colores: ['Azul', 'Gris', 'Negro'], talles: ['S', 'M', 'L', 'XL'], stock: 35, imagen: '', destacado: true },
      { id: 'p8', nombre: 'Short deportivo', categoriaId: 'c-indumentaria', precio: 22500, descripcion: 'Short flexible con cintura elástica y bolsillo lateral.', colores: ['Negro', 'Gris'], talles: ['S', 'M', 'L'], stock: 22, imagen: '', destacado: false },
      { id: 'p9', nombre: 'Hoodie Gym', categoriaId: 'c-indumentaria', precio: 49900, descripcion: 'Hoodie de algodón con puños elásticos y capucha ajustable.', colores: ['Gris', 'Azul'], talles: ['M', 'L', 'XL'], stock: 10, imagen: '', destacado: false }
    ],
    users: [
      { id: 'u-demo', nombre: 'Usuario Demo', email: 'usuario@demo.com', password: '1234', rol: 'usuario' },
      { id: 'v-demo', nombre: 'Vendedor Demo', email: 'vendedor@demo.com', password: '1234', rol: 'vendedor' }
    ]
  };

  /* ---------- Persistencia ---------- */
  const memoria = {}; // respaldo si localStorage no está disponible

  function leer(clave, porDefecto) {
    try {
      const raw = window.localStorage.getItem(clave);
      if (raw !== null) return JSON.parse(raw);
    } catch (err) { /* se usa el respaldo en memoria */ }
    return Object.prototype.hasOwnProperty.call(memoria, clave) ? memoria[clave] : porDefecto;
  }

  function guardar(clave, valor) {
    memoria[clave] = valor;
    try { window.localStorage.setItem(clave, JSON.stringify(valor)); } catch (err) { /* modo memoria */ }
  }

  function sembrarDatos() {
    if (leer(STORAGE.categories, null) === null) guardar(STORAGE.categories, SEED.categories);
    if (leer(STORAGE.products, null) === null) guardar(STORAGE.products, SEED.products);
    if (leer(STORAGE.users, null) === null) guardar(STORAGE.users, SEED.users);
    if (leer(STORAGE.cart, null) === null) guardar(STORAGE.cart, []);
    if (leer(STORAGE.orders, null) === null) guardar(STORAGE.orders, []);
    if (leer(STORAGE.session, null) === null) guardar(STORAGE.session, null);
  }

  sembrarDatos();

  const state = {
    categories: leer(STORAGE.categories, []),
    products: leer(STORAGE.products, []),
    users: leer(STORAGE.users, []),
    session: leer(STORAGE.session, null),
    cart: leer(STORAGE.cart, []),
    orders: leer(STORAGE.orders, []),
    filters: { texto: '', categoria: '', min: null, max: null, talles: [], colores: [], orden: 'destacados' },
    authRole: 'usuario',
    authMode: 'login',
    currentView: 'inicio'
  };

  /* ---------- Utilidades ---------- */
  const $ = (id) => document.getElementById(id);

  function esc(valor) {
    return String(valor === undefined || valor === null ? '' : valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function uid(prefijo) {
    return prefijo + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function money(numero) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(numero) || 0);
  }

  function fecha(iso) {
    try { return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (err) { return String(iso); }
  }

  function getProduct(id) { return state.products.find((p) => p.id === id) || null; }
  function getCategory(id) { return state.categories.find((c) => c.id === id) || null; }
  function catNombre(producto) { const c = getCategory(producto.categoriaId); return c ? c.nombre : 'Sin categoría'; }

  function placeholderImage(producto) {
    const texto = (producto.nombre || 'GYM').split(' ').slice(0, 2).join(' ').toUpperCase();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#64748b"/></linearGradient></defs>' +
      '<rect width="600" height="420" fill="url(#g)"/><circle cx="480" cy="60" r="130" fill="#ffffff" opacity="0.07"/>' +
      '<circle cx="70" cy="380" r="160" fill="#ffffff" opacity="0.05"/>' +
      '<text x="50%" y="52%" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#ffffff" opacity="0.92">' + esc(texto) + '</text>' +
      '<text x="50%" y="63%" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" letter-spacing="4" fill="#dbeafe">GYMSTORE</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function imageSrc(producto) {
    return producto.imagen && producto.imagen.trim() ? esc(producto.imagen.trim()) : placeholderImage(producto);
  }

  let toastTimer;
  function toast(mensaje, tipo) {
    const root = $('toastRoot');
    root.innerHTML = '<div class="toast toast-' + (tipo || 'info') + '">' + esc(mensaje) + '</div>';
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { root.innerHTML = ''; }, 3200);
  }

  function lista(texto) {
    return [...new Set(String(texto || '').split(',').map((s) => s.trim()).filter(Boolean))];
  }

  /* ---------- Sincronización entre pestañas ---------- */
  function sincronizarDesdeStorage() {
    state.categories = leer(STORAGE.categories, []);
    state.products = leer(STORAGE.products, []);
    state.users = leer(STORAGE.users, []);
    state.session = leer(STORAGE.session, null);
    state.cart = leer(STORAGE.cart, []);
    state.orders = leer(STORAGE.orders, []);

    updateHeader();
    actualizarContador();
    renderCategoryNav();
    renderFilterOptions();
    syncFiltersUI();
    if (state.currentView === 'inicio') renderHome();
    if (state.currentView === 'catalogo') renderCatalogo();
    if (state.currentView === 'carrito') renderCarrito();
    if (state.currentView === 'perfil') renderPerfil();
    if (state.currentView === 'vendedor') renderVendedor();
  }

  /* ---------- Navegación ---------- */
  function mostrarVista(id) {
    const vista = $('vista-' + id);
    if (!vista) return;
    document.querySelectorAll('.vista').forEach((v) => v.classList.toggle('is-active', v.id === 'vista-' + id));
    document.querySelectorAll('.main-nav [data-vista]').forEach((b) => b.classList.toggle('active', b.dataset.vista === id));
    state.currentView = id;
    if (id === 'inicio') renderHome();
    if (id === 'catalogo') renderCatalogo();
    if (id === 'carrito') renderCarrito();
    if (id === 'perfil') renderPerfil();
    if (id === 'vendedor') renderVendedor();
    $('mainNav').classList.remove('is-open');
    $('menuToggle').setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Inicio ---------- */
  function renderHome() {
    const iconos = ['💊', '🏋️', '👕'];
    $('homeCategories').innerHTML = state.categories.map((c, i) =>
      '<button class="category-card" data-cat="' + esc(c.id) + '">' +
        '<span class="category-icon">' + (iconos[i % iconos.length]) + '</span>' +
        '<h3>' + esc(c.nombre) + '</h3><p>' + esc(c.descripcion || '') + '</p>' +
        '<span class="link-btn">Explorar →</span></button>'
    ).join('');

    const destacados = state.products.filter((p) => p.destacado).slice(0, 4);
    $('featuredProducts').innerHTML = destacados.length
      ? destacados.map(productCard).join('')
      : '<p class="hint">Todavía no hay productos destacados.</p>';
  }

  function renderCategoryNav() {
    $('categoryNav').innerHTML = state.categories.map((c) =>
      '<button class="cat-chip" data-cat="' + esc(c.id) + '">' + esc(c.nombre) + '</button>'
    ).join('');
  }

  /* ---------- Catálogo y filtros ---------- */
  function renderFilterOptions() {
    const actual = state.filters.categoria;
    $('filterCategoria').innerHTML = '<option value="">Todas las categorías</option>' +
      state.categories.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.nombre) + '</option>').join('');
    $('filterCategoria').value = actual;

    const talles = [...new Set(state.products.reduce((acc, p) => acc.concat(p.talles || []), []))]
      .sort((a, b) => a.localeCompare(b, 'es'));
    const colores = [...new Set(state.products.reduce((acc, p) => acc.concat(p.colores || []), []))]
      .sort((a, b) => a.localeCompare(b, 'es'));

    $('filterTalles').innerHTML = talles.map((t) =>
      '<label class="chip"><input type="checkbox" value="' + esc(t) + '" data-filter="talles" /><span>' + esc(t) + '</span></label>'
    ).join('');
    $('filterColores').innerHTML = colores.map((c) =>
      '<label class="chip"><input type="checkbox" value="' + esc(c) + '" data-filter="colores" /><span>' + esc(c) + '</span></label>'
    ).join('');
  }

  function syncFiltersUI() {
    const f = state.filters;
    $('filterSearch').value = f.texto;
    $('globalSearch').value = f.texto;
    $('filterCategoria').value = f.categoria;
    $('minPrice').value = f.min === null ? '' : f.min;
    $('maxPrice').value = f.max === null ? '' : f.max;
    $('sortBy').value = f.orden;
    document.querySelectorAll('[data-filter="talles"]').forEach((ch) => { ch.checked = f.talles.includes(ch.value); });
    document.querySelectorAll('[data-filter="colores"]').forEach((ch) => { ch.checked = f.colores.includes(ch.value); });
  }

  function productosFiltrados() {
    const f = state.filters;
    const texto = f.texto.trim().toLowerCase();
    const lista = state.products.filter((p) => {
      if (texto && !((p.nombre + ' ' + (p.descripcion || '') + ' ' + catNombre(p)).toLowerCase().includes(texto))) return false;
      if (f.categoria && p.categoriaId !== f.categoria) return false;
      if (f.min !== null && Number(p.precio) < f.min) return false;
      if (f.max !== null && Number(p.precio) > f.max) return false;
      if (f.talles.length && !(p.talles || []).some((t) => f.talles.includes(t))) return false;
      if (f.colores.length && !(p.colores || []).some((c) => f.colores.includes(c))) return false;
      return true;
    });

    if (f.orden === 'precio-asc') lista.sort((a, b) => a.precio - b.precio);
    else if (f.orden === 'precio-desc') lista.sort((a, b) => b.precio - a.precio);
    else if (f.orden === 'nombre') lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    else lista.sort((a, b) => Number(b.destacado) - Number(a.destacado) || a.nombre.localeCompare(b.nombre, 'es'));
    return lista;
  }

  function productCard(p) {
    const talles = (p.talles || []).length
      ? '<label>Talle<select class="card-select card-talle">' + p.talles.map((t) => '<option value="' + esc(t) + '">' + esc(t) + '</option>').join('') + '</select></label>'
      : '';
    const colores = (p.colores || []).length
      ? '<label>Color<select class="card-select card-color">' + p.colores.map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('') + '</select></label>'
      : '';
    return '<article class="product-card">' +
      '<div class="product-image"><img src="' + imageSrc(p) + '" alt="' + esc(p.nombre) + '" /></div>' +
      '<div class="product-body"><span class="tag">' + esc(catNombre(p)) + '</span>' +
      '<h3>' + esc(p.nombre) + '</h3><p class="product-desc">' + esc(p.descripcion || '') + '</p>' +
      '<div class="card-selectors">' + talles + colores + '</div>' +
      '<div class="card-bottom"><span class="price">' + money(p.precio) + '</span>' +
      '<button class="btn btn-primary btn-sm" data-add="' + esc(p.id) + '"' + (p.stock <= 0 ? ' disabled' : '') + '>' +
      (p.stock > 0 ? 'Agregar' : 'Sin stock') + '</button></div></div></article>';
  }

  function renderCatalogo() {
    const productos = productosFiltrados();
    $('resultsCount').textContent = productos.length + (productos.length === 1 ? ' producto' : ' productos');
    $('productGrid').innerHTML = productos.map(productCard).join('');
    $('emptyCatalog').classList.toggle('is-hidden', productos.length > 0);
  }

  let debounceId;
  function renderCatalogoDebounced() {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(function () {
      if (state.currentView === 'catalogo') renderCatalogo();
    }, 150);
  }

  function limpiarFiltros() {
    state.filters = { texto: '', categoria: '', min: null, max: null, talles: [], colores: [], orden: 'destacados' };
    syncFiltersUI();
    renderCatalogo();
  }

  /* ---------- Carrito ---------- */
  function actualizarContador() {
    $('cartCount').textContent = state.cart.reduce((s, it) => s + it.cantidad, 0);
  }

  function guardarCarrito() {
    guardar(STORAGE.cart, state.cart);
    actualizarContador();
  }

  function totales() {
    const subtotal = state.cart.reduce((s, it) => {
      const p = getProduct(it.productoId);
      return s + (p ? Number(p.precio) * it.cantidad : 0);
    }, 0);
    const envio = subtotal === 0 ? 0 : (subtotal >= ENVIO_GRATIS_DESDE ? 0 : ENVIO_FIJO);
    return { subtotal: subtotal, envio: envio, total: subtotal + envio };
  }

  function agregarAlCarrito(id, card) {
    const p = getProduct(id);
    if (!p) return;
    if (p.stock <= 0) { toast('Ese producto no tiene stock disponible.', 'error'); return; }
    const talle = card && card.querySelector('.card-talle') ? card.querySelector('.card-talle').value : '';
    const color = card && card.querySelector('.card-color') ? card.querySelector('.card-color').value : '';
    const key = p.id + '::' + talle + '::' + color;
    const existente = state.cart.find((it) => it.key === key);
    if (existente) {
      if (existente.cantidad >= p.stock) { toast('No hay más unidades disponibles.', 'error'); return; }
      existente.cantidad += 1;
    } else {
      state.cart.push({ key: key, productoId: p.id, talle: talle, color: color, cantidad: 1 });
    }
    guardarCarrito();
    toast('Producto agregado al carrito.', 'ok');
    if (state.currentView === 'carrito') renderCarrito();
  }

  function cambiarCantidad(index, delta) {
    const item = state.cart[index];
    if (!item) return;
    const p = getProduct(item.productoId);
    const nueva = item.cantidad + Number(delta);
    if (nueva <= 0) { state.cart.splice(index, 1); }
    else if (p && nueva > p.stock) { toast('Stock máximo alcanzado para este producto.', 'error'); return; }
    else { item.cantidad = nueva; }
    guardarCarrito();
    renderCarrito();
  }

  function renderCarrito() {
    const root = $('cartItems');
    const resumen = $('cartSummary');
    if (!state.cart.length) {
      root.innerHTML = '<div class="empty-state"><span>🛒</span><h3>Tu carrito está vacío</h3><p>Agregá productos desde el catálogo para empezar.</p><button class="btn btn-primary" data-vista="catalogo">Ir al catálogo</button></div>';
      resumen.innerHTML = '';
      return;
    }

    root.innerHTML = state.cart.map((it, index) => {
      const p = getProduct(it.productoId);
      if (!p) return '';
      const variante = [it.talle, it.color].filter(Boolean).join(' · ') || 'Presentación única';
      return '<article class="cart-item">' +
        '<img src="' + imageSrc(p) + '" alt="' + esc(p.nombre) + '" />' +
        '<div class="cart-item-info"><h3>' + esc(p.nombre) + '</h3><p>' + esc(variante) + '</p>' +
        '<span class="price">' + money(p.precio * it.cantidad) + '</span></div>' +
        '<div class="qty"><button type="button" data-qty="-1" data-index="' + index + '" aria-label="Quitar una unidad">−</button>' +
        '<span>' + it.cantidad + '</span><button type="button" data-qty="1" data-index="' + index + '" aria-label="Agregar una unidad">+</button></div>' +
        '<button type="button" class="remove-btn" data-remove="' + index + '" aria-label="Eliminar producto">✕</button></article>';
    }).join('');

    const t = totales();
    resumen.innerHTML = '<h3>Resumen de compra</h3>' +
      '<div class="summary-row"><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>' +
      '<div class="summary-row"><span>Envío</span><span>' + (t.envio === 0 ? 'Gratis' : money(t.envio)) + '</span></div>' +
      '<div class="summary-row total"><span>Total</span><span>' + money(t.total) + '</span></div>' +
      (t.envio > 0 ? '<p class="hint">Envío gratis a partir de ' + money(ENVIO_GRATIS_DESDE) + '.</p>' : '') +
      '<button class="btn btn-primary btn-block" id="checkoutBtn">Finalizar compra</button>' +
      (!state.session ? '<p class="hint">Necesitás iniciar sesión como usuario para comprar.</p>' : '');
  }

  function finalizarCompra() {
    if (!state.session) { toast('Ingresá como usuario para finalizar la compra.', 'error'); mostrarVista('ingreso'); return; }
    if (state.session.rol !== 'usuario') { toast('Un vendedor no puede comprar. Ingresá como usuario.', 'error'); return; }
    if (!state.cart.length) { toast('El carrito está vacío.', 'error'); return; }
    const t = totales();
    const items = state.cart.map((it) => {
      const p = getProduct(it.productoId);
      return { productoId: it.productoId, nombre: p ? p.nombre : 'Producto', precio: p ? p.precio : 0, talle: it.talle, color: it.color, cantidad: it.cantidad };
    });
    const orden = {
      id: uid('orden'),
      userId: state.session.userId,
      items: items,
      subtotal: t.subtotal,
      envio: t.envio,
      total: t.total,
      fecha: new Date().toISOString(),
      estado: 'Preparando',
      seguimiento: 'GYM-' + Math.floor(10000000 + Math.random() * 89999999)
    };
    state.orders.unshift(orden);
    guardar(STORAGE.orders, state.orders);

    items.forEach((it) => {
      const p = getProduct(it.productoId);
      if (p) p.stock = Math.max(0, Number(p.stock) - it.cantidad);
    });
    guardar(STORAGE.products, state.products);

    state.cart = [];
    guardarCarrito();
    renderHome();
    renderFilterOptions();
    syncFiltersUI();
    toast('¡Compra confirmada! Seguí tu envío en mi perfil.', 'ok');
    mostrarVista('perfil');
  }

  /* ---------- Autenticación ---------- */
  function updateHeader() {
    const btn = $('userButton');
    const out = $('logoutButton');
    if (state.session) {
      btn.textContent = state.session.rol === 'vendedor' ? 'Panel vendedor' : 'Mi cuenta';
      out.classList.remove('is-hidden');
    } else {
      btn.textContent = 'Ingresar';
      out.classList.add('is-hidden');
    }
  }

  function setAuthRole(rol) {
    state.authRole = rol;
    document.querySelectorAll('[data-auth-role]').forEach((b) => b.classList.toggle('active', b.dataset.authRole === rol));
    $('authError').textContent = '';
  }

  function setAuthMode(modo) {
    state.authMode = modo;
    document.querySelectorAll('[data-auth-mode]').forEach((b) => b.classList.toggle('active', b.dataset.authMode === modo));
    $('nombreField').classList.toggle('is-hidden', modo !== 'registro');
    $('authNombre').required = modo === 'registro';
    $('authSubmit').textContent = modo === 'registro' ? 'Crear cuenta' : 'Ingresar';
    $('authError').textContent = '';
  }

  function enviarAuth(e) {
    e.preventDefault();
    const error = $('authError');
    error.textContent = '';
    const nombre = $('authNombre').value.trim();
    const email = $('authEmail').value.trim().toLowerCase();
    const password = $('authPassword').value;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error.textContent = 'Ingresá un email válido.'; return; }
    if (password.length < 4) { error.textContent = 'La contraseña debe tener al menos 4 caracteres.'; return; }

    if (state.authMode === 'registro') {
      if (!nombre) { error.textContent = 'Ingresá tu nombre.'; return; }
      if (state.users.some((u) => u.email.toLowerCase() === email)) { error.textContent = 'Ya existe una cuenta con ese email.'; return; }
      const usuario = { id: uid('u'), nombre: nombre, email: email, password: password, rol: state.authRole };
      state.users.push(usuario);
      guardar(STORAGE.users, state.users);
      state.session = { userId: usuario.id, rol: usuario.rol };
      guardar(STORAGE.session, state.session);
      $('authForm').reset();
      updateHeader();
      toast('¡Cuenta creada con éxito!', 'ok');
      mostrarVista(usuario.rol === 'vendedor' ? 'vendedor' : 'perfil');
      return;
    }

    const usuario = state.users.find((u) => u.email.toLowerCase() === email && u.password === password);
    if (!usuario) { error.textContent = 'Email o contraseña incorrectos.'; return; }
    if (usuario.rol !== state.authRole) {
      error.textContent = 'No hay una cuenta de ' + (state.authRole === 'vendedor' ? 'vendedor' : 'usuario') + ' con esos datos. Cambiá de pestaña e intentá de nuevo.';
      return;
    }
    state.session = { userId: usuario.id, rol: usuario.rol };
    guardar(STORAGE.session, state.session);
    $('authForm').reset();
    updateHeader();
    toast('¡Bienvenido/a, ' + usuario.nombre.split(' ')[0] + '!', 'ok');
    mostrarVista(usuario.rol === 'vendedor' ? 'vendedor' : 'perfil');
  }

  function cerrarSesion() {
    state.session = null;
    guardar(STORAGE.session, null);
    updateHeader();
    toast('Cerraste sesión.', 'info');
    mostrarVista('inicio');
  }

  /* ---------- Perfil de usuario ---------- */
  function timelineHTML(estado) {
    const indice = Math.max(0, ESTADOS.indexOf(estado));
    return '<div class="timeline">' + ESTADOS.map((e, i) =>
      '<div class="tstep ' + (i < indice ? 'done' : '') + ' ' + (i === indice ? 'current' : '') + '">' +
      '<span class="tdot">' + (i < indice ? '✓' : i + 1) + '</span><span>' + e + '</span></div>'
    ).join('') + '</div>';
  }

  function renderPerfil() {
    const usuario = state.session && state.session.rol === 'usuario'
      ? state.users.find((u) => u.id === state.session.userId) : null;
    const gate = $('profileGate');
    const content = $('profileContent');

    if (!usuario) {
      gate.classList.remove('is-hidden');
      content.classList.add('is-hidden');
      const otraSesion = Boolean(state.session);
      $('profileGateTitle').textContent = otraSesion ? 'Esta sección es solo para usuarios' : 'Ingresá para ver tus compras';
      $('profileGateText').textContent = otraSesion
        ? 'Estás ingresado/a como vendedor. Cerrá sesión y entrá con una cuenta de usuario.'
        : 'Necesitás una cuenta de usuario para ver tu historial y seguir tus envíos.';
      $('profileGateBtn').classList.toggle('is-hidden', otraSesion);
      $('profileGateLogout').classList.toggle('is-hidden', !otraSesion);
      return;
    }

    gate.classList.add('is-hidden');
    content.classList.remove('is-hidden');
    const misOrdenes = state.orders.filter((o) => o.userId === usuario.id);
    const gasto = misOrdenes.reduce((s, o) => s + Number(o.total || 0), 0);

    $('profileInfo').innerHTML = '<div class="avatar">' + esc(usuario.nombre.charAt(0).toUpperCase()) + '</div>' +
      '<h2>' + esc(usuario.nombre) + '</h2><p class="order-meta">Cuenta de usuario</p>' +
      '<div class="mini-label">Email</div><div class="mini-value">' + esc(usuario.email) + '</div>' +
      '<div class="mini-label">Compras realizadas</div><div class="mini-value">' + misOrdenes.length + '</div>' +
      '<div class="mini-label">Total invertido</div><div class="mini-value">' + money(gasto) + '</div>' +
      '<div class="mini-label">Cerrar sesión</div><button class="btn btn-ghost btn-sm" data-action="logout">Salir de mi cuenta</button>';

    $('ordersList').innerHTML = misOrdenes.length ? misOrdenes.map((o) =>
      '<article class="order-card"><div class="order-head"><h3>Pedido #' + esc(o.id.slice(-6).toUpperCase()) + '</h3>' +
      '<span class="status-badge ' + (o.estado === 'Entregado' ? 'entregado' : '') + '">' + esc(o.estado) + '</span></div>' +
      '<p class="order-meta">' + fecha(o.fecha) + ' · Seguimiento: <strong>' + esc(o.seguimiento) + '</strong></p>' +
      '<ul class="order-items">' + o.items.map((it) =>
        '<li><span>' + esc(it.cantidad) + ' × ' + esc(it.nombre) + (it.talle || it.color ? ' (' + esc([it.talle, it.color].filter(Boolean).join(' · ')) + ')' : '') + '</span><span>' + money(it.precio * it.cantidad) + '</span></li>'
      ).join('') + '</ul>' +
      '<div class="order-total">Total: ' + money(o.total) + '</div>' + timelineHTML(o.estado) + '</article>'
    ).join('') : '<div class="empty-state"><span>📦</span><h3>Todavía no hiciste compras</h3><p>Cuando finalices una compra vas a poder seguirla desde acá.</p><button class="btn btn-primary" data-vista="catalogo">Ir al catálogo</button></div>';
  }

  /* ---------- Panel del vendedor ---------- */
  function renderVendedor() {
    const esVendedor = Boolean(state.session && state.session.rol === 'vendedor');
    const gate = $('sellerGate');
    const content = $('sellerContent');

    if (!esVendedor) {
      gate.classList.remove('is-hidden');
      content.classList.add('is-hidden');
      const otraSesion = Boolean(state.session);
      $('sellerGateTitle').textContent = otraSesion ? 'Acceso reservado para vendedores' : 'Acceso de vendedor requerido';
      $('sellerGateText').textContent = otraSesion
        ? 'Estás ingresado/a como usuario. Cerrá sesión y entrá con una cuenta de vendedor.'
        : 'Ingresá con una cuenta de vendedor para administrar la tienda.';
      $('sellerGateBtn').classList.toggle('is-hidden', otraSesion);
      $('sellerGateLogout').classList.toggle('is-hidden', !otraSesion);
      return;
    }

    gate.classList.add('is-hidden');
    content.classList.remove('is-hidden');

    // Leemos siempre del almacenamiento para ver pedidos creados en otra pestaña/sesión.
    state.categories = leer(STORAGE.categories, state.categories);
    state.products = leer(STORAGE.products, state.products);
    state.orders = leer(STORAGE.orders, state.orders);

    const stockBajo = state.products.filter((p) => Number(p.stock) < 10).length;

    $('sellerStats').innerHTML = [
      ['Productos', state.products.length],
      ['Categorías', state.categories.length],
      ['Stock bajo (<10)', stockBajo],
      ['Pedidos', state.orders.length]
    ].map((s) => '<div class="stat-card"><span>' + s[0] + '</span><strong>' + s[1] + '</strong></div>').join('');

    renderTablaProductos();
    renderListaCategorias();
    renderListaPedidos();
  }

  function renderTablaProductos() {
    $('sellerProductsBody').innerHTML = state.products.map((p) =>
      '<tr><td class="prod-name">' + esc(p.nombre) + '</td><td>' + esc(catNombre(p)) + '</td>' +
      '<td>' + money(p.precio) + '</td><td>' + esc(p.stock) + '</td>' +
      '<td class="' + (p.destacado ? 'badge-si' : 'badge-no') + '">' + (p.destacado ? 'Sí' : 'No') + '</td>' +
      '<td><div class="row-actions"><button class="mini-btn" data-edit-product="' + esc(p.id) + '">Editar</button>' +
      '<button class="mini-btn danger" data-delete-product="' + esc(p.id) + '">Eliminar</button></div></td></tr>'
    ).join('') || '<tr><td colspan="6">No hay productos cargados.</td></tr>';
  }

  function renderListaCategorias() {
    $('sellerCategories').innerHTML = state.categories.map((c) => {
      const cantidad = state.products.filter((p) => p.categoriaId === c.id).length;
      return '<div class="list-row"><div class="list-row-main"><h3>' + esc(c.nombre) + '</h3>' +
        '<p>' + esc(c.descripcion || 'Sin descripción') + ' · ' + cantidad + ' producto(s)</p></div>' +
        '<button class="mini-btn" data-edit-cat="' + esc(c.id) + '">Editar</button>' +
        '<button class="mini-btn danger" data-delete-cat="' + esc(c.id) + '">Eliminar</button></div>';
    }).join('') || '<div class="empty-state"><p>No hay categorías todavía.</p></div>';
  }

  function renderListaPedidos() {
    $('sellerOrders').innerHTML = state.orders.length ? state.orders.map((o) => {
      const cliente = state.users.find((u) => u.id === o.userId);
      return '<div class="list-row"><div class="list-row-main"><h3>Pedido #' + esc(o.id.slice(-6).toUpperCase()) + ' · ' + money(o.total) + '</h3>' +
        '<p>' + esc(cliente ? cliente.nombre : 'Cliente') + ' · ' + fecha(o.fecha) + ' · ' + esc(o.seguimiento) + '</p>' +
        '<p>' + esc(o.items.map((it) => it.cantidad + ' × ' + it.nombre).join(', ')) + '</p></div>' +
        '<select data-order-status="' + esc(o.id) + '" aria-label="Estado del pedido">' +
        ESTADOS.map((e) => '<option value="' + e + '"' + (o.estado === e ? ' selected' : '') + '>' + e + '</option>').join('') +
        '</select></div>';
    }).join('') : '<div class="empty-state"><span>📦</span><h3>No hay pedidos</h3><p>Los pedidos de los usuarios van a aparecer acá.</p></div>';
  }

  function setPanel(id) {
    document.querySelectorAll('.panel-tab').forEach((b) => b.classList.toggle('active', b.dataset.panel === id));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('is-active', p.id === 'panel-' + id));
  }

  function resetCategoryForm() {
    $('categoryId').value = '';
    $('categoryNombre').value = '';
    $('categoryDescripcion').value = '';
    $('categorySubmit').textContent = 'Agregar';
    $('categoryCancel').classList.add('is-hidden');
  }

  function guardarCategoria(e) {
    e.preventDefault();
    const nombre = $('categoryNombre').value.trim();
    if (!nombre) { toast('El nombre de la categoría es obligatorio.', 'error'); return; }
    const id = $('categoryId').value;
    const descripcion = $('categoryDescripcion').value.trim();
    if (id) {
      const cat = getCategory(id);
      if (cat) { cat.nombre = nombre; cat.descripcion = descripcion; }
      toast('Categoría actualizada.', 'ok');
    } else {
      state.categories.push({ id: uid('c'), nombre: nombre, descripcion: descripcion });
      toast('Categoría agregada.', 'ok');
    }
    guardar(STORAGE.categories, state.categories);
    resetCategoryForm();
    renderCategoryNav();
    renderFilterOptions();
    syncFiltersUI();
    renderHome();
    renderVendedor();
  }

  function eliminarCategoria(id) {
    const cat = getCategory(id);
    if (!cat) return;
    const usada = state.products.some((p) => p.categoriaId === id);
    if (usada) { toast('No se puede eliminar: hay productos que usan esa categoría.', 'error'); return; }
    if (!window.confirm('¿Eliminar la categoría "' + cat.nombre + '"?')) return;
    state.categories = state.categories.filter((c) => c.id !== id);
    guardar(STORAGE.categories, state.categories);
    if (state.filters.categoria === id) state.filters.categoria = '';
    renderCategoryNav();
    renderFilterOptions();
    syncFiltersUI();
    renderHome();
    renderVendedor();
    toast('Categoría eliminada.', 'info');
  }

  /* ---------- Modal de producto ---------- */
  function closeModal() { $('modalRoot').innerHTML = ''; }

  function openProductModal(id) {
    const p = id ? getProduct(id) : null;
    const opciones = state.categories.map((c) =>
      '<option value="' + esc(c.id) + '"' + (p && p.categoriaId === c.id ? ' selected' : '') + '>' + esc(c.nombre) + '</option>'
    ).join('');

    $('modalRoot').innerHTML = '<div class="modal-overlay" id="modalOverlay"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
      '<div class="modal-head"><h2 id="modalTitle">' + (p ? 'Editar producto' : 'Nuevo producto') + '</h2>' +
      '<button type="button" class="icon-btn" id="closeModal" aria-label="Cerrar">✕</button></div>' +
      '<form id="productForm"><div class="modal-body">' +
      '<div class="field full"><label for="prodNombre">Nombre</label><input id="prodNombre" required value="' + esc(p ? p.nombre : '') + '" placeholder="Ej: Proteína Whey 1 kg" /></div>' +
      '<div class="field"><label for="prodCategoria">Categoría</label><select id="prodCategoria">' + opciones + '</select></div>' +
      '<div class="field"><label for="prodPrecio">Precio ($)</label><input id="prodPrecio" type="number" min="0" step="1" required value="' + esc(p ? p.precio : '') + '" placeholder="0" /></div>' +
      '<div class="field full"><label for="prodDescripcion">Descripción</label><textarea id="prodDescripcion" placeholder="Características del producto">' + esc(p ? p.descripcion : '') + '</textarea></div>' +
      '<div class="field"><label for="prodColores">Colores disponibles</label><input id="prodColores" value="' + esc(p ? (p.colores || []).join(', ') : '') + '" placeholder="Ej: Negro, Azul, Gris" /><span class="help-text">Separá los colores con comas.</span></div>' +
      '<div class="field"><label for="prodTalles">Talles disponibles</label><input id="prodTalles" value="' + esc(p ? (p.talles || []).join(', ') : '') + '" placeholder="Ej: S, M, L, XL" /><span class="help-text">Separá los talles con comas.</span></div>' +
      '<div class="field"><label for="prodStock">Stock</label><input id="prodStock" type="number" min="0" step="1" required value="' + esc(p ? p.stock : 0) + '" /></div>' +
      '<div class="field"><label for="prodImagen">URL de imagen (opcional)</label><input id="prodImagen" type="url" value="' + esc(p ? p.imagen : '') + '" placeholder="https://..." /><span class="help-text">Si se deja vacío se genera una imagen de ejemplo.</span></div>' +
      '<div class="field full checkbox-field"><input id="prodDestacado" type="checkbox"' + (p && p.destacado ? ' checked' : '') + ' /><label for="prodDestacado">Mostrar en productos destacados del inicio</label></div>' +
      '</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelModal">Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">' + (p ? 'Guardar cambios' : 'Agregar producto') + '</button></div></form></div></div>';

    $('closeModal').addEventListener('click', closeModal);
    $('cancelModal').addEventListener('click', closeModal);
    $('modalOverlay').addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') closeModal(); });
    $('productForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const nombre = $('prodNombre').value.trim();
      const precio = Number($('prodPrecio').value);
      const stock = Number($('prodStock').value);
      if (!nombre) { toast('El nombre es obligatorio.', 'error'); return; }
      if (!Number.isFinite(precio) || precio < 0) { toast('Ingresá un precio válido.', 'error'); return; }
      if (!Number.isFinite(stock) || stock < 0) { toast('Ingresá un stock válido.', 'error'); return; }
      const datos = {
        nombre: nombre,
        categoriaId: $('prodCategoria').value || (state.categories[0] ? state.categories[0].id : ''),
        precio: precio,
        descripcion: $('prodDescripcion').value.trim(),
        colores: lista($('prodColores').value),
        talles: lista($('prodTalles').value),
        stock: stock,
        imagen: $('prodImagen').value.trim(),
        destacado: $('prodDestacado').checked
      };
      if (p) { Object.assign(p, datos); toast('Producto actualizado.', 'ok'); }
      else { state.products.push(Object.assign({ id: uid('p') }, datos)); toast('Producto agregado.', 'ok'); }
      guardar(STORAGE.products, state.products);
      closeModal();
      renderVendedor();
      renderHome();
      renderFilterOptions();
      syncFiltersUI();
      if (state.currentView === 'catalogo') renderCatalogo();
      if (state.currentView === 'carrito') renderCarrito();
    });
  }

  function eliminarProducto(id) {
    const p = getProduct(id);
    if (!p) return;
    if (!window.confirm('¿Eliminar el producto "' + p.nombre + '"?')) return;
    state.products = state.products.filter((x) => x.id !== id);
    guardar(STORAGE.products, state.products);
    renderVendedor();
    renderHome();
    renderFilterOptions();
    syncFiltersUI();
    renderCatalogo();
    toast('Producto eliminado.', 'info');
  }

  /* ---------- Eventos globales ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#checkoutBtn')) { finalizarCompra(); return; }

    const logout = e.target.closest('[data-action="logout"]');
    if (logout) { cerrarSesion(); return; }

    const vista = e.target.closest('[data-vista]');
    if (vista) { e.preventDefault(); mostrarVista(vista.dataset.vista); return; }

    const cat = e.target.closest('[data-cat]');
    if (cat) {
      state.filters.categoria = cat.dataset.cat;
      syncFiltersUI();
      mostrarVista('catalogo');
      return;
    }

    const catNombreBtn = e.target.closest('[data-cat-name]');
    if (catNombreBtn) {
      const encontrada = state.categories.find((c) => c.nombre.toLowerCase() === catNombreBtn.dataset.catName.toLowerCase());
      state.filters.categoria = encontrada ? encontrada.id : '';
      syncFiltersUI();
      mostrarVista('catalogo');
      return;
    }

    const add = e.target.closest('[data-add]');
    if (add) { agregarAlCarrito(add.dataset.add, add.closest('.product-card')); return; }

    const qty = e.target.closest('[data-qty]');
    if (qty) { cambiarCantidad(Number(qty.dataset.index), qty.dataset.qty); return; }

    const remove = e.target.closest('[data-remove]');
    if (remove) { state.cart.splice(Number(remove.dataset.remove), 1); guardarCarrito(); renderCarrito(); return; }

    const tab = e.target.closest('[data-panel]');
    if (tab) {
      setPanel(tab.dataset.panel);
      if (tab.dataset.panel === 'pedidos') {
        state.orders = leer(STORAGE.orders, state.orders);
        renderListaPedidos();
      }
      return;
    }

    if (e.target.closest('#refreshOrdersBtn')) {
      renderVendedor();
      toast('Pedidos actualizados.', 'ok');
      return;
    }

    const authRole = e.target.closest('[data-auth-role]');
    if (authRole) { setAuthRole(authRole.dataset.authRole); return; }

    const authMode = e.target.closest('[data-auth-mode]');
    if (authMode) { setAuthMode(authMode.dataset.authMode); return; }

    const editProduct = e.target.closest('[data-edit-product]');
    if (editProduct) { openProductModal(editProduct.dataset.editProduct); return; }

    const deleteProduct = e.target.closest('[data-delete-product]');
    if (deleteProduct) { eliminarProducto(deleteProduct.dataset.deleteProduct); return; }

    const editCat = e.target.closest('[data-edit-cat]');
    if (editCat) {
      const c = getCategory(editCat.dataset.editCat);
      if (c) {
        $('categoryId').value = c.id;
        $('categoryNombre').value = c.nombre;
        $('categoryDescripcion').value = c.descripcion || '';
        $('categorySubmit').textContent = 'Guardar cambios';
        $('categoryCancel').classList.remove('is-hidden');
        setPanel('categorias');
        $('categoryNombre').focus();
      }
      return;
    }

    const deleteCat = e.target.closest('[data-delete-cat]');
    if (deleteCat) { eliminarCategoria(deleteCat.dataset.deleteCat); return; }

    if (e.target.closest('#newProductBtn')) { openProductModal(null); return; }
    if (e.target.closest('#clearFilters') || e.target.closest('#emptyClear')) { limpiarFiltros(); return; }
    if (e.target.closest('#categoryCancel')) { resetCategoryForm(); return; }
  });

  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-filter]') || e.target.id === 'filterCategoria' || e.target.id === 'sortBy') {
      const f = state.filters;
      if (e.target.id === 'filterCategoria') f.categoria = e.target.value;
      else if (e.target.id === 'sortBy') f.orden = e.target.value;
      else {
        const grupo = e.target.dataset.filter;
        f[grupo] = [...document.querySelectorAll('[data-filter="' + grupo + '"]:checked')].map((ch) => ch.value);
      }
      renderCatalogo();
      return;
    }

    const status = e.target.closest('[data-order-status]');
    if (status) {
      const orden = state.orders.find((o) => o.id === status.dataset.orderStatus);
      if (orden) {
        orden.estado = status.value;
        guardar(STORAGE.orders, state.orders);
        toast('Estado del pedido actualizado.', 'ok');
        renderListaPedidos();
        if (state.currentView === 'perfil') renderPerfil();
      }
    }
  });

  function init() {
    $('menuToggle').addEventListener('click', function () {
      const abierto = $('mainNav').classList.toggle('is-open');
      $('menuToggle').setAttribute('aria-expanded', String(abierto));
    });

    $('userButton').addEventListener('click', function () {
      if (!state.session) mostrarVista('ingreso');
      else mostrarVista(state.session.rol === 'vendedor' ? 'vendedor' : 'perfil');
    });
    $('logoutButton').addEventListener('click', cerrarSesion);

    $('searchForm').addEventListener('submit', function (e) {
      e.preventDefault();
      state.filters.texto = $('globalSearch').value.trim();
      $('filterSearch').value = state.filters.texto;
      mostrarVista('catalogo');
    });

    $('globalSearch').addEventListener('input', function (e) {
      state.filters.texto = e.target.value;
      $('filterSearch').value = e.target.value;
      renderCatalogoDebounced();
    });
    $('filterSearch').addEventListener('input', function (e) {
      state.filters.texto = e.target.value;
      $('globalSearch').value = e.target.value;
      renderCatalogoDebounced();
    });

    $('minPrice').addEventListener('input', function (e) {
      state.filters.min = e.target.value === '' ? null : Number(e.target.value);
      renderCatalogoDebounced();
    });
    $('maxPrice').addEventListener('input', function (e) {
      state.filters.max = e.target.value === '' ? null : Number(e.target.value);
      renderCatalogoDebounced();
    });

    $('authForm').addEventListener('submit', enviarAuth);
    $('categoryForm').addEventListener('submit', guardarCategoria);

    window.addEventListener('storage', function (e) {
      if (!e.key || e.key.indexOf('gym_') === 0) sincronizarDesdeStorage();
    });

    renderCategoryNav();
    renderFilterOptions();
    syncFiltersUI();
    renderHome();
    updateHeader();
    setAuthMode('login');
    mostrarVista('inicio');
  }

  init();
})();
