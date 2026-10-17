"use strict";

const STORAGE_KEY = "la-tiendita-inventory-v1";
const RATE_STORAGE_KEY = "la-tiendita-bcv-rate-v1";
const RATE_ENDPOINT = "https://ve.dolarapi.com/v1/dolares/oficial";
const DELIVERY_STORAGE_KEY = "la-tiendita-latest-delivery-v1";
const DELIVERY_ORIGIN = { latitude: 10.4806, longitude: -66.9036 };
const DELIVERY_ZONE_KM = 5;
const DELIVERY_ZONE_PRICE = 1;
const DISCOUNT_THRESHOLD = 50;
const DISCOUNT_RATE = 0.1;
const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD"
});
const bolivarFormatter = new Intl.NumberFormat("es-VE", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const productForm = document.querySelector("#product-form");
const productNameInput = document.querySelector("#product-name");
const productCategoryInput = document.querySelector("#product-category");
const productPriceInput = document.querySelector("#product-price");
const productStockInput = document.querySelector("#product-stock");
const productList = document.querySelector("#product-list");
const catalogProducts = document.querySelector("#catalog-products");
const emptyState = document.querySelector("#empty-state");
const noResults = document.querySelector("#no-results");
const searchInput = document.querySelector("#search-input");
const inventorySearchInput = document.querySelector("#inventory-search-input");
const stockFilter = document.querySelector("#stock-filter");
const formFeedback = document.querySelector("#form-feedback");
const stockAlert = document.querySelector("#stock-alert");
const purchaseMessage = document.querySelector("#purchase-message");
const purchaseTotal = document.querySelector("#purchase-total");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartCount = document.querySelector("#cart-count");
const cartTotal = document.querySelector("#cart-total");
const cartDeliveryLine = document.querySelector("#cart-delivery-line");
const checkoutButton = document.querySelector("#checkout-button");
const checkoutDialog = document.querySelector("#checkout-dialog");
const paymentDetailsDialog = document.querySelector("#payment-details-dialog");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutTotal = document.querySelector("#checkout-total");
const checkoutFeedback = document.querySelector("#checkout-feedback");
const deliveryToggle = document.querySelector("#delivery-toggle");
const deliveryFields = document.querySelector("#delivery-fields");
const deliveryAddress = document.querySelector("#delivery-address");
const deliveryFeedback = document.querySelector("#delivery-feedback");
const checkoutDelivery = document.querySelector("#checkout-delivery");
const deliveryMapLink = document.querySelector("#delivery-map-link");
const deliveryMapPreview = document.querySelector("#delivery-map-preview");
const mapFeedback = document.querySelector("#map-feedback");
const openMapPickerButton = document.querySelector("#open-google-maps");
const useCurrentLocationButton = document.querySelector("#use-current-location");
const deliveryDriver = document.querySelector("#delivery-driver");
const deliveryEstimate = document.querySelector("#delivery-estimate");
const deliveryFeeLabel = document.querySelector("#delivery-fee");
const deliveryFeeBsLabel = document.querySelector("#delivery-fee-bs");
const deliveryZoneDescription = document.querySelector("#delivery-zone-description");
const mapPickerDialog = document.querySelector("#map-picker-dialog");
const mapPickerInput = document.querySelector("#map-picker-input");
const mapPickerMapElement = document.querySelector("#map-picker-map");
const mapPickerFeedback = document.querySelector("#map-picker-feedback");
const mapPickerCurrentLocationButton = document.querySelector("#map-picker-current-location");

let products = loadProducts();
let cart = [];
let exchangeRate = loadCachedRate();
let deliveryCoordinates = null;
let mapPickerCoordinates = null;
let mapPickerSearchTimer;
let mapPickerMap;
let mapPickerMarker;
let deliveryFee = 0;
let latestDelivery = loadLatestDelivery();
let activeCategory = "Todos";
let editingProductId = null;

function loadProducts() {
	try {
		const savedProducts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
		return Array.isArray(savedProducts)
			? savedProducts.filter((product) =>
				product && typeof product.id === "string" &&
				typeof product.name === "string" &&
				Number.isFinite(product.price) && product.price > 0 &&
				Number.isInteger(product.stock) && product.stock >= 0
			).map((product) => ({
				...product,
				category: ["Carnes", "Víveres", "Bebidas", "Lácteos", "Otros"].includes(product.category)
					? product.category
					: "Otros"
			}))
			: [];
	} catch {
		return [];
	}
}

function loadCachedRate() {
	try {
		const cachedRate = JSON.parse(localStorage.getItem(RATE_STORAGE_KEY) || "null");
		return cachedRate && Number.isFinite(cachedRate.value) && cachedRate.value > 0 ? cachedRate : null;
	} catch {
		return null;
	}
}

function loadLatestDelivery() {
	try {
		const savedDelivery = JSON.parse(localStorage.getItem(DELIVERY_STORAGE_KEY) || "null");
		return savedDelivery && Number.isInteger(savedDelivery.status) ? savedDelivery : null;
	} catch {
		return null;
	}
}

async function loadDailyRate() {
	const updatedLabel = document.querySelector("#rate-updated");
	if (exchangeRate) {
		renderExchangeRate("Tasa guardada · ");
	}

	try {
		const response = await fetch(RATE_ENDPOINT, { cache: "no-store" });
		if (!response.ok) {
			throw new Error("No se pudo consultar la tasa.");
		}
		const data = await response.json();
		if (!Number.isFinite(data.promedio) || data.promedio <= 0 || !data.fechaActualizacion) {
			throw new Error("La respuesta de la tasa no es válida.");
		}
		exchangeRate = { value: data.promedio, date: data.fechaActualizacion };
		localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(exchangeRate));
		renderExchangeRate();
		renderProducts();
		renderCart();
	} catch {
		if (exchangeRate) {
			renderExchangeRate("Sin conexión · última tasa guardada · ");
		} else {
			document.querySelector("#daily-rate-value").textContent = "No disponible";
			updatedLabel.textContent = "Conéctate para actualizar";
			renderProducts();
			renderCart();
		}
	}
}

function renderExchangeRate(prefix = "Fecha valor · ") {
	const formattedRate = new Intl.NumberFormat("es-VE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4
	}).format(exchangeRate.value);
	document.querySelector("#daily-rate-value").textContent = `Bs ${formattedRate}`;
	document.querySelector("#rate-updated").textContent = `${prefix}${new Intl.DateTimeFormat("es-VE", {
		day: "numeric",
		month: "short",
		year: "numeric"
	}).format(new Date(exchangeRate.date))}`;
}

function saveProducts() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
	} catch {
		showFeedback("No se pudo guardar en este navegador.", true);
	}
}

function formatMoney(amount) {
	return currencyFormatter.format(amount);
}

function formatBolivars(amount) {
	return exchangeRate ? `Bs. ${bolivarFormatter.format(amount * exchangeRate.value)}` : "Tasa no disponible";
}

function getDiscountedPrice(price) {
	return price > DISCOUNT_THRESHOLD ? price * (1 - DISCOUNT_RATE) : price;
}

function showFeedback(message, isError = false) {
	formFeedback.textContent = message;
	formFeedback.classList.toggle("error", isError);
}

function getCartQuantity(productId) {
	return cart.find((item) => item.productId === productId)?.quantity || 0;
}

function getCartTotal() {
	return cart.reduce((total, item) => {
		const product = products.find((entry) => entry.id === item.productId);
		return product ? total + getDiscountedPrice(product.price) * item.quantity : total;
	}, 0);
}

function getOrderTotal() {
	return getCartTotal() + (deliveryToggle.checked ? deliveryFee : 0);
}

function distanceBetween(first, second) {
	const radians = (degrees) => degrees * Math.PI / 180;
	const latitudeDifference = radians(second.latitude - first.latitude);
	const longitudeDifference = radians(second.longitude - first.longitude);
	const arc = Math.sin(latitudeDifference / 2) ** 2 +
		Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) *
		Math.sin(longitudeDifference / 2) ** 2;
	return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function updateDeliveryEstimate() {
	if (!deliveryCoordinates) {
		deliveryFee = 0;
		deliveryEstimate.hidden = true;
		return;
	}
	const distanceKm = distanceBetween(DELIVERY_ORIGIN, deliveryCoordinates);
	const zone = Math.max(1, Math.ceil(distanceKm / DELIVERY_ZONE_KM));
	deliveryFee = zone * DELIVERY_ZONE_PRICE;
	deliveryFeeLabel.textContent = formatMoney(deliveryFee);
	deliveryFeeBsLabel.textContent = formatBolivars(deliveryFee);
	deliveryZoneDescription.textContent = `Zona ${zone} · ${distanceKm.toFixed(1)} km desde Caracas centro`;
	deliveryEstimate.hidden = false;
	if (cart.length > 0) {
		renderCart();
	}
}

function renderProducts() {
	const searchTerm = searchInput.value.trim().toLocaleLowerCase("es");
	const visibleProducts = products.filter((product) =>
		product.name.toLocaleLowerCase("es").includes(searchTerm) &&
		(activeCategory === "Todos" || product.category === activeCategory)
	);
	catalogProducts.replaceChildren();
	productList.replaceChildren();

	for (const product of visibleProducts) {
		const discountedPrice = getDiscountedPrice(product.price);
		const card = document.createElement("article");
		card.className = `product-card${product.stock === 0 ? " product-card-soldout" : ""}`;
		const visual = document.createElement("div");
		visual.className = `product-card-visual category-${product.category.toLocaleLowerCase("es").replace("á", "a").replace("é", "e")}`;
		visual.setAttribute("aria-hidden", "true");
		visual.textContent = ({ Carnes: "🥩", Víveres: "🛒", Bebidas: "🥤", "Lácteos": "🥛", Otros: "🌿" })[product.category];
		const details = document.createElement("div");
		details.className = "product-card-details";
		const category = document.createElement("span");
		category.className = "product-category-label";
		category.textContent = product.category;
		const status = document.createElement("span");
		status.className = `product-status${product.stock === 0 ? " sold-out" : product.stock <= 3 ? " low-stock" : ""}`;
		status.textContent = product.stock === 0 ? "Agotado" : product.stock <= 3 ? "Pocas unidades" : "Disponible";
		const name = document.createElement("h3");
		name.className = "product-card-name";
		name.textContent = product.name;
		const price = document.createElement("div");
		price.className = "product-card-price";
		if (discountedPrice < product.price) {
			const originalPrice = document.createElement("span");
			originalPrice.className = "old-price";
			originalPrice.textContent = formatMoney(product.price);
			price.append(originalPrice);
		}
		const currentPrice = document.createElement("strong");
		currentPrice.textContent = formatMoney(discountedPrice);
		price.append(currentPrice);
		if (discountedPrice < product.price) {
			const discountTag = document.createElement("span");
			discountTag.className = "discount-tag";
			discountTag.textContent = "-10%";
			price.append(discountTag);
		}
		const bolivarPrice = document.createElement("span");
		bolivarPrice.className = "rate-price";
		bolivarPrice.textContent = formatBolivars(discountedPrice);
		price.append(bolivarPrice);
		details.append(category, status, name, price);

		const controls = document.createElement("div");
		controls.className = "product-card-controls";
		const quantityInput = document.createElement("input");
		quantityInput.className = "buy-quantity";
		quantityInput.type = "number";
		quantityInput.min = "1";
		const availableStock = product.stock - getCartQuantity(product.id);
		quantityInput.max = String(Math.max(1, availableStock));
		quantityInput.value = "1";
		quantityInput.setAttribute("aria-label", `Cantidad de ${product.name} para añadir al carrito`);
		const buyButton = document.createElement("button");
		buyButton.className = "buy-button";
		buyButton.type = "button";
		buyButton.textContent = product.stock === 0 ? "Agotado" : "Añadir al carrito";
		buyButton.disabled = product.stock === 0 || availableStock === 0;
		buyButton.addEventListener("click", () => {
			addToCart(product.id, quantityInput.value);
		});
		controls.append(quantityInput, buyButton);
		card.append(visual, details, controls);
		catalogProducts.append(card);
	}

	emptyState.hidden = products.length > 0;
	noResults.hidden = products.length === 0 || visibleProducts.length > 0;
	renderAdminProducts();
	document.querySelector("#product-count").textContent = String(products.length);
	document.querySelector("#unit-count").textContent = String(
		products.reduce((total, product) => total + product.stock, 0)
	);
	document.querySelector("#out-of-stock-count").textContent = String(
		products.filter((product) => product.stock === 0).length
	);
	const exhaustedCount = products.filter((product) => product.stock === 0).length;
	const adminStockAlert = document.querySelector("#admin-stock-alert");
	adminStockAlert.hidden = exhaustedCount === 0;
	adminStockAlert.textContent = exhaustedCount === 0
		? ""
		: `${exhaustedCount} ${exhaustedCount === 1 ? "producto agotado requiere" : "productos agotados requieren"} reposición. Filtra el inventario para revisarlos.`;
	document.querySelector("#inventory-value").textContent = formatMoney(
		products.reduce((total, product) => total + getDiscountedPrice(product.price) * product.stock, 0)
	);
}

function renderAdminProducts() {
	const searchTerm = inventorySearchInput.value.trim().toLocaleLowerCase("es");
	const filter = stockFilter.value;
	const visibleProducts = products.filter((product) => {
		const matchesName = product.name.toLocaleLowerCase("es").includes(searchTerm);
		const matchesStock = filter === "all" ||
			(filter === "available" && product.stock > 0) ||
			(filter === "out" && product.stock === 0) ||
			(filter === "low" && product.stock > 0 && product.stock <= 3);
		return matchesName && matchesStock;
	});
	productList.replaceChildren();

	for (const product of visibleProducts) {
		const row = document.createElement("tr");
		const nameCell = document.createElement("td");
		nameCell.textContent = product.name;
		const categoryCell = document.createElement("td");
		categoryCell.textContent = product.category;
		const priceCell = document.createElement("td");
		priceCell.className = "price-cell";
		priceCell.textContent = formatMoney(product.price);
		const stockCell = document.createElement("td");
		const stockInput = document.createElement("input");
		stockInput.className = "stock-edit-input";
		stockInput.type = "number";
		stockInput.min = "0";
		stockInput.step = "1";
		stockInput.value = String(product.stock);
		stockInput.setAttribute("aria-label", `Existencias de ${product.name}`);
		stockCell.append(stockInput);
		const actionCell = document.createElement("td");
		const actionWrap = document.createElement("div");
		actionWrap.className = "inventory-actions";
		const status = document.createElement("span");
		status.className = `stock-pill${product.stock === 0 ? " low" : product.stock <= 3 ? " low" : ""}`;
		status.textContent = product.stock === 0 ? "Agotado" : product.stock <= 3 ? "Stock bajo" : "En stock";
		const editButton = document.createElement("button");
		editButton.className = "inventory-action-button";
		editButton.type = "button";
		editButton.textContent = "Editar";
		editButton.addEventListener("click", () => beginProductEdit(product));
		const updateButton = document.createElement("button");
		updateButton.className = "inventory-action-button";
		updateButton.type = "button";
		updateButton.textContent = "Guardar";
		updateButton.addEventListener("click", () => updateProductStock(product.id, stockInput.value));
		const deleteButton = document.createElement("button");
		deleteButton.className = "inventory-delete-button";
		deleteButton.type = "button";
		deleteButton.textContent = "Eliminar";
		deleteButton.addEventListener("click", () => deleteProduct(product.id));
		actionWrap.append(status, editButton, updateButton, deleteButton);
		actionCell.append(actionWrap);
		row.append(nameCell, categoryCell, priceCell, stockCell, actionCell);
		productList.append(row);
	}
	document.querySelector("#admin-empty-state").hidden = visibleProducts.length > 0;
	productList.closest(".table-wrap").scrollLeft = 0;
}

function beginProductEdit(product) {
	editingProductId = product.id;
	productNameInput.value = product.name;
	productCategoryInput.value = product.category;
	productPriceInput.value = String(product.price);
	productStockInput.value = String(product.stock);
	document.querySelector("#submit-product-button").innerHTML = "<span aria-hidden=\"true\">✓</span> Guardar cambios";
	document.querySelector("#cancel-edit-button").hidden = false;
	showFeedback(`Editando ${product.name}.`);
	productForm.scrollIntoView({ behavior: "smooth", block: "center" });
	productNameInput.focus();
}

function cancelProductEdit() {
	editingProductId = null;
	productForm.reset();
	document.querySelector("#submit-product-button").innerHTML = "<span aria-hidden=\"true\">＋</span> Agregar al inventario";
	document.querySelector("#cancel-edit-button").hidden = true;
	formFeedback.textContent = "";
	formFeedback.classList.remove("error");
}

function updateProductStock(productId, requestedStock) {
	const product = products.find((item) => item.id === productId);
	const stock = Number(requestedStock);
	if (!product || !Number.isInteger(stock) || stock < 0) {
		showFeedback("La existencia debe ser un número entero igual o mayor que cero.", true);
		return;
	}
	product.stock = stock;
	if (getCartQuantity(productId) > stock) {
		cart = cart.filter((item) => item.productId !== productId);
		showFeedback(`${product.name}: el stock se actualizó y se retiró del carrito porque excedía las existencias.`);
	} else {
		showFeedback(`${product.name}: existencias actualizadas a ${stock}.`);
	}
	saveProducts();
	renderProducts();
	renderCart();
}

function deleteProduct(productId) {
	const product = products.find((item) => item.id === productId);
	if (!product || !window.confirm(`¿Eliminar "${product.name}" del inventario?`)) {
		return;
	}
	products = products.filter((item) => item.id !== productId);
	cart = cart.filter((item) => item.productId !== productId);
	saveProducts();
	showFeedback(`${product.name} fue eliminado del inventario.`);
	renderProducts();
	renderCart();
}

function restockProduct(productId, requestedQuantity) {
	const product = products.find((item) => item.id === productId);
	const quantity = Number(requestedQuantity);
	if (!product || product.stock !== 0 || !Number.isInteger(quantity) || quantity < 1) {
		showFeedback("Indica una cantidad entera mayor que cero para reponer.", true);
		return;
	}
	product.stock += quantity;
	stockAlert.hidden = true;
	showFeedback(`${product.name}: ${quantity} unidades repuestas.`);
	saveProducts();
	renderProducts();
	renderCart();
}

function addToCart(productId, requestedQuantity) {
	const product = products.find((item) => item.id === productId);
	const quantity = Number(requestedQuantity);
	const alreadyInCart = getCartQuantity(productId);
	if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity + alreadyInCart > product.stock) {
		showFeedback("La cantidad supera las unidades disponibles.", true);
		return;
	}

	const cartItem = cart.find((item) => item.productId === productId);
	if (cartItem) {
		cartItem.quantity += quantity;
	} else {
		cart.push({ productId, quantity });
	}
	showFeedback(`${product.name} añadido al carrito.`);
	renderCart();
	renderProducts();
}


function updateCartQuantity(productId, requestedQuantity) {
	const product = products.find((item) => item.id === productId);
	const quantity = Number(requestedQuantity);
	if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
		return;
	}
	const cartItem = cart.find((item) => item.productId === productId);
	if (cartItem) {
		cartItem.quantity = quantity;
	}
	renderCart();
	renderProducts();
}

function removeFromCart(productId) {
	cart = cart.filter((item) => item.productId !== productId);
	renderCart();
	renderProducts();
}

function renderCart() {
	cartItems.replaceChildren();
	let totalQuantity = 0;

	for (const item of cart) {
		const product = products.find((entry) => entry.id === item.productId);
		if (!product) {
			continue;
		}
		totalQuantity += item.quantity;
		const line = document.createElement("li");
		line.className = "cart-item";
		const info = document.createElement("div");
		info.className = "cart-item-info";
		const name = document.createElement("span");
		name.className = "cart-item-name";
		name.textContent = product.name;
		const linePrice = document.createElement("span");
		linePrice.className = "cart-item-price";
		linePrice.textContent = `${formatMoney(getDiscountedPrice(product.price))} c/u · ${formatMoney(getDiscountedPrice(product.price) * item.quantity)} · ${formatBolivars(getDiscountedPrice(product.price) * item.quantity)}`;
		info.append(name, linePrice);

		const controls = document.createElement("div");
		controls.className = "cart-item-controls";
		const quantityInput = document.createElement("input");
		quantityInput.className = "cart-item-quantity";
		quantityInput.type = "number";
		quantityInput.min = "1";
		quantityInput.max = String(product.stock);
		quantityInput.value = String(item.quantity);
		quantityInput.setAttribute("aria-label", `Cantidad de ${product.name} en el carrito`);
		quantityInput.addEventListener("change", () => updateCartQuantity(product.id, quantityInput.value));
		const removeButton = document.createElement("button");
		removeButton.className = "remove-item";
		removeButton.type = "button";
		removeButton.textContent = "×";
		removeButton.title = `Quitar ${product.name} del carrito`;
		removeButton.setAttribute("aria-label", `Quitar ${product.name} del carrito`);
		removeButton.addEventListener("click", () => removeFromCart(product.id));
		controls.append(quantityInput, removeButton);
		line.append(info, controls);
		cartItems.append(line);
	}

	const total = getOrderTotal();
	cartCount.textContent = String(totalQuantity);
	cartEmpty.hidden = cart.length > 0;
	cartItems.hidden = cart.length === 0;
	cartTotal.textContent = formatMoney(total);
	document.querySelector("#cart-total-bs").textContent = formatBolivars(total);
	cartDeliveryLine.hidden = !deliveryToggle.checked || deliveryFee <= 0;
	cartDeliveryLine.textContent = cartDeliveryLine.hidden ? "" : `Delivery · ${formatMoney(deliveryFee)} (${formatBolivars(deliveryFee)})`;
	checkoutTotal.textContent = formatMoney(total);
	document.querySelector("#checkout-total-bs").textContent = formatBolivars(total);
	checkoutButton.disabled = cart.length === 0;
}

function openCheckout() {
	if (cart.length === 0) {
		return;
	}
	if (deliveryToggle.checked && !deliveryCoordinates) {
		deliveryFeedback.textContent = "Marca el punto de entrega en el mapa para calcular la zona y el costo.";
		openMapPickerButton.focus();
		return;
	}
	if (deliveryToggle.checked && !deliveryDriver.value.trim()) {
		deliveryFeedback.textContent = "Asigna un conductor antes de cerrar el pedido con delivery.";
		deliveryDriver.focus();
		return;
	}
	deliveryFeedback.textContent = "";
	checkoutFeedback.textContent = "";
	checkoutForm.reset();
	checkoutForm.querySelectorAll(".payment-details").forEach((details) => {
		details.hidden = true;
	});
	checkoutTotal.textContent = formatMoney(getOrderTotal());
	document.querySelector("#checkout-total-bs").textContent = formatBolivars(getOrderTotal());
	checkoutDelivery.hidden = !deliveryToggle.checked;
	checkoutDelivery.textContent = deliveryToggle.checked ? `Delivery · ${getDeliveryLocation()} · ${formatMoney(deliveryFee)} (${formatBolivars(deliveryFee)})` : "";
	checkoutDialog.showModal();
}

function getDeliveryLocation() {
	const address = deliveryAddress.value.trim();
	const mapLink = getValidatedMapLink();
	if (deliveryCoordinates) {
		const coordinates = `${deliveryCoordinates.latitude.toFixed(6)}, ${deliveryCoordinates.longitude.toFixed(6)}`;
		const hasReadableAddress = address && !/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(address);
		const location = hasReadableAddress ? `${address} (${coordinates})` : coordinates;
		return `${location}${mapLink ? ` · ${mapLink}` : ""}`;
	}
	if (address && mapLink) {
		return `${address} · Google Maps: ${mapLink}`;
	}
	return address || mapLink;
}

function getValidatedMapLink() {
	const value = deliveryMapLink.value.trim();
	if (!value) {
		return "";
	}
	try {
		const url = new URL(value);
		const hostname = url.hostname.toLowerCase();
		const isGoogleMaps = hostname === "maps.app.goo.gl" ||
			hostname === "goo.gl" ||
			hostname === "maps.google.com" ||
			(hostname === "google.com" || hostname === "www.google.com") && url.pathname.startsWith("/maps");
		return url.protocol === "https:" && isGoogleMaps ? url.href : "";
	} catch {
		return "";
	}
}

function getMapSearchQuery() {
	if (deliveryCoordinates) {
		return `${deliveryCoordinates.latitude},${deliveryCoordinates.longitude}`;
	}
	const mapLink = getValidatedMapLink();
	if (mapLink) {
		const coordinates = mapLink.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
			mapLink.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
		if (coordinates) {
			return `${coordinates[1]},${coordinates[2]}`;
		}
		try {
			const url = new URL(mapLink);
			const search = url.searchParams.get("query") || url.searchParams.get("q");
			if (search) {
				return search;
			}
		} catch {
			return deliveryAddress.value.trim();
		}
	}
	return deliveryAddress.value.trim();
}

function updateDeliveryMap() {
	const query = getMapSearchQuery();
	if (query) {
		deliveryMapPreview.src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
		deliveryMapPreview.hidden = false;
	} else {
		deliveryMapPreview.removeAttribute("src");
		deliveryMapPreview.hidden = true;
	}
}

function openMapPicker() {
	mapPickerCoordinates = deliveryCoordinates ? { ...deliveryCoordinates } : null;
	mapPickerInput.value = deliveryCoordinates
		? `${deliveryCoordinates.latitude.toFixed(6)}, ${deliveryCoordinates.longitude.toFixed(6)}`
		: deliveryAddress.value.trim() || getMapSearchQuery();
	mapPickerFeedback.textContent = mapPickerInput.value
		? "Ajusta la búsqueda y toca el mapa para colocar el pin."
		: "Busca una dirección o toca el mapa para colocar el pin.";
	updateMapPicker();
	mapPickerDialog.showModal();
	window.setTimeout(() => mapPickerMap.invalidateSize(), 50);
}

function updateMapPicker() {
	if (!mapPickerMap) {
		mapPickerMap = L.map(mapPickerMapElement, { scrollWheelZoom: true }).setView([DELIVERY_ORIGIN.latitude, DELIVERY_ORIGIN.longitude], 12);
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
		}).addTo(mapPickerMap);
		mapPickerMap.on("click", (event) => setMapPickerSelection(event.latlng, true));
	}
	if (mapPickerCoordinates) {
		mapPickerMap.setView([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude], 16);
		if (mapPickerMarker) {
			mapPickerMarker.setLatLng([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude]);
		} else {
			mapPickerMarker = L.marker([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude], { draggable: true }).addTo(mapPickerMap);
			mapPickerMarker.on("dragend", () => setMapPickerSelection(mapPickerMarker.getLatLng(), true));
		}
	} else if (mapPickerInput.value.trim()) {
		searchMapLocation();
	}
	document.querySelector("#map-picker-selection-summary").textContent = mapPickerCoordinates
		? "Punto marcado en el mapa"
		: "Toca el mapa para colocar el pin";
	document.querySelector("#map-picker-coordinates").textContent = mapPickerCoordinates
		? `${mapPickerCoordinates.latitude.toFixed(6)}, ${mapPickerCoordinates.longitude.toFixed(6)}`
		: "";
	document.querySelector("#open-map-picker-google").href = mapPickerCoordinates
		? `https://www.google.com/maps/search/?api=1&query=${mapPickerCoordinates.latitude},${mapPickerCoordinates.longitude}`
		: "https://www.google.com/maps";
}

async function searchMapLocation() {
	const query = mapPickerInput.value.trim();
	if (!query) {
		mapPickerFeedback.textContent = "Escribe una dirección o lugar para buscar.";
		return;
	}
	mapPickerFeedback.textContent = "Buscando lugar...";
	try {
		const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
		if (!response.ok) {
			throw new Error("Búsqueda no disponible");
		}
		const results = await response.json();
		if (results.length === 0) {
			mapPickerFeedback.textContent = "No encontramos ese lugar. Prueba otra dirección o toca el mapa.";
			return;
		}
		const result = results[0];
		mapPickerInput.value = result.display_name;
		mapPickerCoordinates = { latitude: Number(result.lat), longitude: Number(result.lon) };
		mapPickerFeedback.textContent = "Lugar encontrado. Toca el mapa para ajustar el pin y confirma la ubicación.";
		updateMapPicker();
	} catch {
		mapPickerFeedback.textContent = "No pudimos buscar la dirección. Puedes tocar el mapa o usar tu ubicación actual.";
	}
}

async function setMapPickerSelection(point, reverseGeocode = false) {
	mapPickerCoordinates = { latitude: point.lat, longitude: point.lng };
	mapPickerMap.setView([point.lat, point.lng], Math.max(mapPickerMap.getZoom(), 15));
	if (mapPickerMarker) {
		mapPickerMarker.setLatLng([point.lat, point.lng]);
	} else {
		mapPickerMarker = L.marker([point.lat, point.lng], { draggable: true }).addTo(mapPickerMap);
		mapPickerMarker.on("dragend", () => setMapPickerSelection(mapPickerMarker.getLatLng(), true));
	}
	mapPickerInput.value = `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
	mapPickerFeedback.textContent = "Punto marcado. Puedes arrastrar el pin para afinarlo.";
	updateMapPicker();
	if (!reverseGeocode) {
		return;
	}
	try {
		const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}`);
		if (!response.ok) {
			return;
		}
		const result = await response.json();
		if (result.display_name) {
			mapPickerInput.value = result.display_name;
			mapPickerFeedback.textContent = "Dirección encontrada. Confirma para agregarla al pedido.";
			updateMapPicker();
		}
	} catch {
		mapPickerFeedback.textContent = "Punto marcado. Se guardarán las coordenadas seleccionadas.";
	}
}

function selectMapPickerLocation() {
	if (!mapPickerCoordinates) {
		mapPickerFeedback.textContent = "Toca el mapa o busca un lugar para marcar el punto.";
		return;
	}

	deliveryToggle.checked = true;
	deliveryFields.hidden = false;
	deliveryCoordinates = { ...mapPickerCoordinates };
	deliveryAddress.value = mapPickerInput.value.trim();
	deliveryMapLink.value = `https://www.google.com/maps/search/?api=1&query=${deliveryCoordinates.latitude},${deliveryCoordinates.longitude}`;
	deliveryFeedback.textContent = "";
	mapFeedback.textContent = "Ubicación seleccionada desde el mapa.";
	updateDeliveryEstimate();
	updateDeliveryMap();
	mapPickerDialog.close();
}

function useLocationInPicker() {
	if (!navigator.geolocation) {
		mapPickerFeedback.textContent = "Este navegador no permite obtener la ubicación actual.";
		return;
	}
	mapPickerCurrentLocationButton.disabled = true;
	mapPickerFeedback.textContent = "Buscando ubicación...";
	navigator.geolocation.getCurrentPosition((position) => {
		setMapPickerSelection({ lat: position.coords.latitude, lng: position.coords.longitude }, true);
		mapPickerFeedback.textContent = "Ubicación actual lista. Confirma para agregarla al pedido.";
		mapPickerCurrentLocationButton.disabled = false;
	}, () => {
		mapPickerFeedback.textContent = "No se pudo obtener la ubicación. Revisa los permisos del navegador.";
		mapPickerCurrentLocationButton.disabled = false;
	}, { enableHighAccuracy: true, timeout: 10000 });
}

function showPaymentDetails(paymentMethod) {
	const total = getOrderTotal();
	const deliveryCharge = deliveryToggle.checked
		? [{ label: "Costo de delivery", value: `${formatMoney(deliveryFee)} · ${formatBolivars(deliveryFee)}` }]
		: [];
	const methods = {
		"Efectivo": {
			icon: "$",
			description: "Paga al retirar en tienda o al recibir tu pedido.",
			fields: [
				...deliveryCharge,
				{ label: "Total en dólares", value: formatMoney(total) },
				{ label: "Total en bolívares", value: formatBolivars(total) }
			],
			note: "Prepara el monto exacto al momento de la entrega."
		},
		"Pago móvil": {
			icon: "↗",
			description: "Copia los datos para realizar el pago móvil.",
			fields: [
				...deliveryCharge,
				{ label: "Teléfono", value: "0424-633-23-24" },
				{ label: "Cédula", value: "233213345" },
				{ label: "Banco", value: "Provincial" },
				{ label: "Monto en bolívares", value: formatBolivars(total) }
			],
			note: "Verifica el monto y los datos antes de confirmar el pago."
		},
		"Transferencia": {
			icon: "⇄",
			description: "Datos disponibles para transferencia bancaria.",
			fields: [
				...deliveryCharge,
				{ label: "Banco", value: "Provincial" },
				{ label: "Monto en bolívares", value: formatBolivars(total) }
			],
			note: "Falta indicar el número de cuenta y el titular. Solicita esos datos al comercio antes de transferir."
		}
	};
	const details = methods[paymentMethod];
	if (!details) {
		return;
	}

	document.querySelector("#payment-detail-icon").textContent = details.icon;
	document.querySelector("#payment-detail-title").textContent = paymentMethod;
	document.querySelector("#payment-detail-description").textContent = details.description;
	document.querySelector("#payment-detail-note").textContent = details.note;
	document.querySelector("#payment-detail-total").textContent = formatMoney(total);
	document.querySelector("#payment-detail-total-bs").textContent = formatBolivars(total);
	const detailList = document.querySelector("#payment-detail-list");
	detailList.replaceChildren();
	for (const field of details.fields) {
		const row = document.createElement("div");
		row.className = "payment-detail-row";
		const copy = document.createElement("div");
		copy.className = "payment-data-copy";
		const label = document.createElement("span");
		label.className = "payment-data-label";
		label.textContent = field.label;
		const value = document.createElement("strong");
		value.className = "payment-data-value";
		value.textContent = field.value;
		copy.append(label, value);
		const copyButton = document.createElement("button");
		copyButton.className = "copy-data-button";
		copyButton.type = "button";
		copyButton.textContent = "Copiar";
		copyButton.setAttribute("aria-label", `Copiar ${field.label}`);
		copyButton.addEventListener("click", () => copyPaymentData(field.value, copyButton));
		row.append(copy, copyButton);
		detailList.append(row);
	}
	document.querySelector("#copy-feedback").textContent = "";
	const deliveryLocation = deliveryToggle.checked ? getDeliveryLocation() : "";
	const deliverySummary = document.querySelector("#payment-detail-delivery");
	deliverySummary.hidden = !deliveryLocation;
	deliverySummary.textContent = deliveryLocation ? `Delivery · ${deliveryLocation}` : "";
	paymentDetailsDialog.showModal();
}

async function copyPaymentData(value, button) {
	let copied = false;
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(value);
			copied = true;
		} else {
			copied = copyWithSelection(value);
		}
	} catch {
		copied = copyWithSelection(value);
	}
	button.textContent = copied ? "Copiado" : "No se copió";
	button.classList.toggle("copied", copied);
	document.querySelector("#copy-feedback").textContent = copied ? "Dato copiado al portapapeles." : "No se pudo copiar; selecciona el dato y cópialo manualmente.";
}

function copyWithSelection(value) {
	const input = document.createElement("textarea");
	input.value = value;
	input.setAttribute("readonly", "");
	input.style.position = "fixed";
	input.style.opacity = "0";
	document.body.append(input);
	input.select();
	const copied = document.execCommand("copy");
	input.remove();
	return copied;
}

function useCurrentLocation() {
	if (!navigator.geolocation) {
		mapFeedback.textContent = "Este navegador no permite obtener la ubicación actual.";
		return;
	}
	useCurrentLocationButton.disabled = true;
	mapFeedback.textContent = "Buscando ubicación...";
	navigator.geolocation.getCurrentPosition((position) => {
		deliveryCoordinates = {
			latitude: position.coords.latitude,
			longitude: position.coords.longitude
		};
		deliveryAddress.value = `Ubicación GPS (${deliveryCoordinates.latitude.toFixed(6)}, ${deliveryCoordinates.longitude.toFixed(6)})`;
		deliveryToggle.checked = true;
		deliveryFields.hidden = false;
		mapFeedback.textContent = "Ubicación actual señalada en el mapa.";
		deliveryFeedback.textContent = "";
		deliveryMapLink.value = `https://www.google.com/maps/search/?api=1&query=${deliveryCoordinates.latitude},${deliveryCoordinates.longitude}`;
		updateDeliveryEstimate();
		updateDeliveryMap();
		useCurrentLocationButton.disabled = false;
	}, () => {
		mapFeedback.textContent = "No se pudo obtener la ubicación. Revisa los permisos del navegador.";
		useCurrentLocationButton.disabled = false;
	}, { enableHighAccuracy: true, timeout: 10000 });
}

function renderLatestDeliveryTracking() {
	const trackingPanel = document.querySelector("#delivery-tracking");
	if (!latestDelivery) {
		trackingPanel.hidden = true;
		return;
	}
	trackingPanel.hidden = false;
	document.querySelector("#tracking-driver").textContent = `Conductor: ${latestDelivery.driver} · ${latestDelivery.location}`;
	const labels = ["Recogió el pedido", "Pedido en camino", "Pedido entregado"];
	const headlines = ["El conductor recogió tu pedido.", "¡Tu delivery ya está en camino!", "Tu pedido fue entregado."];
	document.querySelector("#tracking-headline").textContent = latestDelivery.status < 0
		? "Tu pedido está siendo preparado."
		: headlines[latestDelivery.status];
	document.querySelector("#tracking-status-badge").textContent = latestDelivery.status < 0
		? "Preparando"
		: labels[latestDelivery.status];
	document.querySelector("#tracking-progress-fill").style.width = `${Math.max(0, (latestDelivery.status + 1) / 3 * 100)}%`;
	document.querySelectorAll(".tracking-step").forEach((button) => {
		const step = Number(button.dataset.deliveryStep);
		button.classList.toggle("is-complete", step < latestDelivery.status);
		button.classList.toggle("is-current", step === latestDelivery.status);
		button.disabled = step > latestDelivery.status + 1 || step <= latestDelivery.status;
	});
}

function advanceDeliveryStatus(step) {
	if (!latestDelivery || step !== latestDelivery.status + 1 || step > 2) {
		return;
	}
	latestDelivery.status = step;
	try {
		localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(latestDelivery));
	} catch {
		return;
	}
	renderLatestDeliveryTracking();
}

function completePurchase(paymentMethod) {
	const unavailable = cart.some((item) => {
		const product = products.find((entry) => entry.id === item.productId);
		return !product || item.quantity > product.stock;
	});
	if (unavailable) {
		checkoutFeedback.textContent = "El stock cambió. Revisa el carrito e inténtalo de nuevo.";
		return;
	}

	const total = getOrderTotal();
	const deliveryLocation = deliveryToggle.checked ? getDeliveryLocation() : "";
	const purchasedItems = cart.map((item) => ({ ...item }));
	for (const item of purchasedItems) {
		const product = products.find((entry) => entry.id === item.productId);
		product.stock -= item.quantity;
	}

	const itemCount = purchasedItems.reduce((count, item) => count + item.quantity, 0);
	purchaseMessage.textContent = `${itemCount} ${itemCount === 1 ? "artículo" : "artículos"} · ${paymentMethod}`;
	purchaseTotal.textContent = formatMoney(total);
	document.querySelector("#purchase-total-bs").textContent = formatBolivars(total);
	document.querySelector("#purchase-delivery").textContent = deliveryLocation
		? `Delivery · ${deliveryLocation} · Conductor: ${deliveryDriver.value.trim()} · ${formatMoney(deliveryFee)} (${formatBolivars(deliveryFee)})`
		: "Retiro en tienda";
	if (deliveryLocation) {
		latestDelivery = { location: deliveryLocation, driver: deliveryDriver.value.trim(), fee: deliveryFee, status: -1 };
		try {
			localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(latestDelivery));
		} catch {
			showFeedback("No se pudo guardar el seguimiento del delivery.", true);
		}
	} else {
		latestDelivery = null;
		localStorage.removeItem(DELIVERY_STORAGE_KEY);
	}
	const exhaustedProducts = purchasedItems
		.map((item) => products.find((entry) => entry.id === item.productId))
		.filter((product) => product.stock === 0)
		.map((product) => product.name);
	if (exhaustedProducts.length > 0) {
		stockAlert.textContent = `¡Atención! Sin unidades disponibles: ${exhaustedProducts.join(", ")}.`;
		stockAlert.hidden = false;
	} else {
		stockAlert.hidden = true;
	}

	cart = [];
	deliveryToggle.checked = false;
	deliveryAddress.value = "";
	deliveryDriver.value = "";
	deliveryMapLink.value = "";
	deliveryCoordinates = null;
	deliveryFee = 0;
	deliveryEstimate.hidden = true;
	deliveryFields.hidden = true;
	saveProducts();
	if (paymentDetailsDialog.open) {
		paymentDetailsDialog.close();
	}
	checkoutDialog.close();
	showFeedback("Compra confirmada.");
	renderCart();
	renderProducts();
	renderLatestDeliveryTracking();
}

productForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const name = productNameInput.value.trim();
	const price = Number(productPriceInput.value);
	const stock = Number(productStockInput.value);

	if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
		showFeedback("Revisa el nombre, el precio y la cantidad ingresados.", true);
		return;
	}

	const editedProduct = editingProductId
		? products.find((product) => product.id === editingProductId)
		: null;
	if (editingProductId && !editedProduct) {
		showFeedback("No se encontró el producto que intentas editar. Actualiza la página e inténtalo de nuevo.", true);
		return;
	}
	if (editedProduct) {
		editedProduct.name = name;
		editedProduct.price = price;
		editedProduct.category = productCategoryInput.value;
		editedProduct.stock = stock;
		if (getCartQuantity(editedProduct.id) > stock) {
			cart = cart.filter((item) => item.productId !== editedProduct.id);
		}
	} else {
		products.push({
			id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
			name,
			price,
			category: productCategoryInput.value,
			stock
		});
	}
	saveProducts();
	productForm.reset();
	editingProductId = null;
	document.querySelector("#submit-product-button").innerHTML = "<span aria-hidden=\"true\">＋</span> Agregar al inventario";
	document.querySelector("#cancel-edit-button").hidden = true;
	showFeedback(editedProduct ? "Cambios guardados en el producto." : "Producto agregado al inventario.");

	if (stock === 0) {
		stockAlert.textContent = `¡Atención! ${name} se registró sin unidades disponibles.`;
		stockAlert.hidden = false;
		document.querySelector("#admin-stock-alert").textContent = `“${name}” fue agregado sin existencias.`;
		document.querySelector("#admin-stock-alert").hidden = false;
	} else {
		stockAlert.hidden = true;
	}
	renderProducts();
	renderCart();
});

document.querySelector("#cancel-edit-button").addEventListener("click", cancelProductEdit);
searchInput.addEventListener("input", renderProducts);
inventorySearchInput.addEventListener("input", renderAdminProducts);
stockFilter.addEventListener("change", renderAdminProducts);
document.querySelector("#category-filters").addEventListener("click", (event) => {
	const button = event.target.closest("[data-category]");
	if (!button) {
		return;
	}
	activeCategory = button.dataset.category;
	document.querySelectorAll(".category-filter").forEach((filterButton) => {
		const isActive = filterButton === button;
		filterButton.classList.toggle("active", isActive);
		filterButton.setAttribute("aria-pressed", String(isActive));
	});
	renderProducts();
});
document.querySelectorAll(".view-switch-button").forEach((button) => {
	button.addEventListener("click", () => {
		document.querySelectorAll(".view-switch-button").forEach((viewButton) => {
			const isActive = viewButton === button;
			viewButton.classList.toggle("active", isActive);
			viewButton.setAttribute("aria-pressed", String(isActive));
		});
		document.querySelectorAll(".app-view").forEach((view) => {
			view.hidden = view.id !== button.dataset.viewTarget;
		});
	});
});
deliveryToggle.addEventListener("change", () => {
	deliveryFields.hidden = !deliveryToggle.checked;
	deliveryFeedback.textContent = "";
	if (deliveryToggle.checked) {
		updateDeliveryEstimate();
	} else {
		deliveryFee = 0;
		deliveryEstimate.hidden = true;
		renderCart();
	}
	updateDeliveryMap();
});
deliveryAddress.addEventListener("input", () => {
	deliveryCoordinates = null;
	deliveryMapLink.value = "";
	updateDeliveryEstimate();
	if (deliveryAddress.value.trim()) {
		deliveryFeedback.textContent = "";
	}
	updateDeliveryMap();
});
deliveryMapLink.addEventListener("input", () => {
	deliveryCoordinates = null;
	updateDeliveryEstimate();
	const validLink = getValidatedMapLink();
	mapFeedback.textContent = deliveryMapLink.value.trim() && !validLink
		? "Pega un enlace https válido de Google Maps."
		: "Enlace de Google Maps listo.";
	updateDeliveryMap();
});
useCurrentLocationButton.addEventListener("click", useCurrentLocation);
openMapPickerButton.addEventListener("click", openMapPicker);
mapPickerInput.addEventListener("input", () => {
	mapPickerCoordinates = null;
	mapPickerFeedback.textContent = "Buscando dirección...";
	document.querySelector("#map-picker-selection-summary").textContent = "Busca y marca un punto en el mapa";
	document.querySelector("#map-picker-coordinates").textContent = "";
	if (mapPickerMarker && mapPickerMap) {
		mapPickerMap.removeLayer(mapPickerMarker);
		mapPickerMarker = null;
	}
	window.clearTimeout(mapPickerSearchTimer);
	mapPickerSearchTimer = window.setTimeout(searchMapLocation, 1000);
});
document.querySelector("#search-map-location").addEventListener("click", searchMapLocation);
mapPickerInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		window.clearTimeout(mapPickerSearchTimer);
		searchMapLocation();
	}
});
mapPickerCurrentLocationButton.addEventListener("click", useLocationInPicker);
document.querySelector("#confirm-map-location").addEventListener("click", selectMapPickerLocation);
document.querySelector("#close-map-picker").addEventListener("click", () => mapPickerDialog.close());
document.querySelector("#cancel-map-picker").addEventListener("click", () => mapPickerDialog.close());
document.querySelectorAll(".tracking-step").forEach((button) => {
	button.addEventListener("click", () => advanceDeliveryStatus(Number(button.dataset.deliveryStep)));
});
checkoutButton.addEventListener("click", openCheckout);
document.querySelector("#close-checkout").addEventListener("click", () => checkoutDialog.close());
document.querySelector("#cancel-checkout").addEventListener("click", () => checkoutDialog.close());
checkoutForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const paymentMethod = checkoutForm.querySelector('input[name="payment-method"]:checked')?.value;
	if (!paymentMethod) {
		checkoutFeedback.textContent = "Selecciona un método de pago para continuar.";
		return;
	}
	showPaymentDetails(paymentMethod);
});
checkoutForm.querySelectorAll('input[name="payment-method"]').forEach((input) => {
	input.addEventListener("change", () => {
		showPaymentDetails(input.value);
	});
});
document.querySelector("#close-payment-details").addEventListener("click", () => paymentDetailsDialog.close());
document.querySelector("#back-to-payment-methods").addEventListener("click", () => paymentDetailsDialog.close());
document.querySelector("#confirm-payment").addEventListener("click", () => {
	const paymentMethod = checkoutForm.querySelector('input[name="payment-method"]:checked')?.value;
	if (paymentMethod) {
		completePurchase(paymentMethod);
	}
});
paymentDetailsDialog.addEventListener("click", (event) => {
	if (event.target === paymentDetailsDialog) {
		paymentDetailsDialog.close();
	}
});
document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("es", {
	day: "numeric",
	month: "long",
	year: "numeric"
}).format(new Date()).toLocaleUpperCase("es");
document.querySelector("#admin-date").textContent = new Intl.DateTimeFormat("es", {
	day: "numeric",
	month: "long",
	year: "numeric"
}).format(new Date()).toLocaleUpperCase("es");

renderProducts();
renderCart();
loadDailyRate();
renderLatestDeliveryTracking();
