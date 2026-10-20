"use strict";

const STORAGE_KEY = "la-tiendita-inventory-v1";
const ORDER_STORAGE_KEY = "la-tiendita-orders-v1";
const RATE_STORAGE_KEY = "la-tiendita-bcv-rate-v1";
const RATE_ENDPOINT = "https://ve.dolarapi.com/v1/dolares/oficial";
const RATE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DELIVERY_ORIGIN = { latitude: 10.4806, longitude: -66.9036 };
const DELIVERY_ZONE_KM = 5;
const DELIVERY_ZONE_PRICE = 1;
const DISCOUNT_THRESHOLD = 50;
const DISCOUNT_RATE = 0.1;
const GRAMS_PER_KILOGRAM = 1000;
const GRAMS_PER_POUND = 453.59237;
const WEIGHT_UNITS = {
	g: { grams: 1, step: "1", minimum: "1" },
	kg: { grams: GRAMS_PER_KILOGRAM, step: "0.001", minimum: "0.001" },
	lb: { grams: GRAMS_PER_POUND, step: "0.01", minimum: "0.01" }
};
try {
	localStorage.removeItem("la-tiendita-supabase-config-v1");
	localStorage.removeItem("la-tiendita-driver-session-v1");
	localStorage.removeItem("la-tiendita-latest-delivery-v1");
} catch {
	// The app can still run when browser storage is unavailable.
}
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
const productCategoryHint = document.querySelector("#product-category-hint");
const productSaleModeInput = document.querySelector("#product-sale-mode");
const productPriceInput = document.querySelector("#product-price");
const productStockInput = document.querySelector("#product-stock");
const productPriceLabel = document.querySelector("#product-price-label");
const productStockLabel = document.querySelector("#product-stock-label");
const productStockGuidance = document.querySelector("#product-stock-guidance");
const productList = document.querySelector("#product-list");
const catalogProducts = document.querySelector("#catalog-products");
const emptyState = document.querySelector("#empty-state");
const noResults = document.querySelector("#no-results");
const searchInput = document.querySelector("#search-input");
const inventorySearchInput = document.querySelector("#inventory-search-input");
const stockFilter = document.querySelector("#stock-filter");
const formFeedback = document.querySelector("#form-feedback");
const stockAlert = document.querySelector("#stock-alert");
const catalogFeedback = document.querySelector("#catalog-feedback");
const purchaseMessage = document.querySelector("#purchase-message");
const purchaseTotal = document.querySelector("#purchase-total");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartCount = document.querySelector("#cart-count");
const cartTotal = document.querySelector("#cart-total");
const cartDeliveryLine = document.querySelector("#cart-delivery-line");
const checkoutButton = document.querySelector("#checkout-button");
const checkoutDialog = document.querySelector("#checkout-dialog");
const deleteConfirmDialog = document.querySelector("#delete-confirm-dialog");
const deleteConfirmProductName = document.querySelector("#delete-confirm-product-name");
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
const deliveryMapLinkPreview = document.querySelector("#delivery-map-link-preview");
const mapFeedback = document.querySelector("#map-feedback");
const openMapPickerButton = document.querySelector("#open-google-maps");
const useCurrentLocationButton = document.querySelector("#use-current-location");
const deliveryEstimate = document.querySelector("#delivery-estimate");
const deliveryFeeLabel = document.querySelector("#delivery-fee");
const deliveryFeeBsLabel = document.querySelector("#delivery-fee-bs");
const deliveryZoneDescription = document.querySelector("#delivery-zone-description");
const mapPickerDialog = document.querySelector("#map-picker-dialog");
const mapPickerInput = document.querySelector("#map-picker-input");
const mapPickerSuggestions = document.querySelector("#map-picker-suggestions");
const mapPickerMapElement = document.querySelector("#map-picker-map");
const mapPickerFeedback = document.querySelector("#map-picker-feedback");
const mapBusinessFeedback = document.querySelector("#map-business-feedback");
const mapPickerCurrentLocationButton = document.querySelector("#map-picker-current-location");
const salesOrdersList = document.querySelector("#sales-orders-list");
const salesEmptyState = document.querySelector("#sales-empty-state");
const salesFilterEmpty = document.querySelector("#sales-filter-empty");
const salesFeedback = document.querySelector("#sales-feedback");
const salesStatusFilter = document.querySelector("#sales-status-filter");
const pendingOrderCount = document.querySelector("#pending-order-count");

let products = loadProducts();
let orders = loadOrders();
let cart = [];
let exchangeRate = loadCachedRate();
let isLoadingExchangeRate = false;
let hasAttemptedExchangeRateLoad = false;
let deliveryCoordinates = null;
let mapPickerCoordinates = null;
let mapPickerSearchTimer;
let mapSuggestionRequestId = 0;
let mapSuggestionItems = [];
let activeMapSuggestionIndex = -1;
let mapPlacesRequestId = 0;
let mapPlacesSearchTimer;
let mapPickerMap;
let mapPickerMarker;
let mapPlacesLayer;
let mapPickerProvider = null;
let googleMapsApiPromise;
let googlePlacePredictions = [];
let googleAutocompleteSessionToken = null;
let deliveryFee = 0;
let activeCategory = "Todos";
let editingProductId = null;
let pendingDeleteProductId = null;
let isSuggestingProductCategory = false;
let lastSuggestedProductCategory = null;

const productCategoryKeywords = [
	["Charcutería", ["mortadela", "salchicha", "chorizo", "salami", "tocineta", "tocino", "pepperoni", "jamon"]],
	["Carnes", ["carne molida", "carne", "res", "bistec", "churrasco", "costilla", "pollo", "pechuga", "muslo", "alas", "pavo", "cerdo", "cochino", "chuleta", "pernil", "lomo"]],
	["Lácteos", ["leche", "queso", "yogurt", "yogur", "mantequilla", "margarina", "crema de leche", "nata"]],
	["Bebidas", ["refresco", "gaseosa", "jugo", "malta", "cerveza", "vino", "ron", "whisky", "vodka", "agua", "bebida", "te frio"]],
	["Víveres", ["arroz", "pasta", "harina", "aceite", "azucar", "cafe", "cereal", "caraota", "lenteja", "frijol", "atun", "sardina", "salsa", "mayonesa", "ketchup", "mostaza", "galleta", "pan", "avena", "granos", "sal"]],
	["Otros", ["jabon", "detergente", "limpieza", "desinfectante", "papel higienico", "servilleta", "shampoo", "champu", "crema dental", "pañal"]]
].flatMap(([category, keywords]) => keywords.map((keyword) => ({ category, keyword })))
	.sort((first, second) => second.keyword.length - first.keyword.length);

function normalizeProductText(value) {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

function suggestProductCategory(name) {
	const normalizedName = normalizeProductText(name).replace(/[^a-z0-9]+/g, " ");
	return productCategoryKeywords.find(({ keyword }) =>
		(` ${normalizedName} `).includes(` ${normalizeProductText(keyword)} `)
	)?.category || null;
}

function updateProductCategorySuggestion() {
	if (editingProductId) {
		return;
	}
	const suggestedCategory = suggestProductCategory(productNameInput.value);
	if (!suggestedCategory) {
		if (lastSuggestedProductCategory && productCategoryInput.value === lastSuggestedProductCategory) {
			isSuggestingProductCategory = true;
			productCategoryInput.value = "Víveres";
			productCategoryInput.dispatchEvent(new Event("change"));
			isSuggestingProductCategory = false;
		}
		lastSuggestedProductCategory = null;
		productCategoryHint.textContent = productNameInput.value.trim()
			? "No reconocí la categoría; puedes elegirla manualmente."
			: "";
		return;
	}
	if (productCategoryInput.value === suggestedCategory) {
		lastSuggestedProductCategory = suggestedCategory;
		productCategoryHint.textContent = `Categoría sugerida: ${suggestedCategory}. Puedes cambiarla si hace falta.`;
		return;
	}
	isSuggestingProductCategory = true;
	productCategoryInput.value = suggestedCategory;
	productCategoryInput.dispatchEvent(new Event("change"));
	isSuggestingProductCategory = false;
	lastSuggestedProductCategory = suggestedCategory;
	productCategoryHint.textContent = `Categoría sugerida: ${suggestedCategory}. Puedes cambiarla si hace falta.`;
}

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
				category: ["Carnes", "Charcutería", "Víveres", "Bebidas", "Lácteos", "Otros"].includes(product.category)
					? product.category
					: "Otros",
				saleMode: product.saleMode === "weight" ? "weight" : "unit"
			}))
			: [];
	} catch {
		return [];
	}
}

function loadOrders() {
	try {
		const savedOrders = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
		return Array.isArray(savedOrders)
			? savedOrders.filter((order) =>
				order && typeof order.id === "string" &&
				typeof order.createdAt === "string" && Number.isFinite(Date.parse(order.createdAt)) &&
				["pending", "accepted", "completed", "rejected"].includes(order.status) &&
				Number.isFinite(order.total) && order.total >= 0 &&
				Array.isArray(order.items) && order.items.length > 0
			)
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

async function loadDailyRate() {
	if (isLoadingExchangeRate || document.visibilityState === "hidden") {
		return;
	}
	isLoadingExchangeRate = true;
	const updatedLabel = document.querySelector("#rate-updated");
	if (exchangeRate && !hasAttemptedExchangeRateLoad) {
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
		hasAttemptedExchangeRateLoad = true;
		renderExchangeRate();
		renderProducts();
		renderCart();
	} catch {
		hasAttemptedExchangeRateLoad = true;
		if (exchangeRate) {
			renderExchangeRate("Sin conexión · última tasa guardada · ");
		} else {
			document.querySelector("#daily-rate-value").textContent = "No disponible";
			updatedLabel.textContent = "Conéctate para actualizar";
			document.querySelector("#shopping-rate-value").textContent = "No disponible";
			document.querySelector("#shopping-rate-updated").textContent = "Conéctate para actualizar";
			renderProducts();
			renderCart();
		}
	} finally {
		isLoadingExchangeRate = false;
	}
}

function renderExchangeRate(prefix = "Fecha valor · ") {
	const formattedRate = new Intl.NumberFormat("es-VE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4
	}).format(exchangeRate.value);
	document.querySelector("#daily-rate-value").textContent = `Bs ${formattedRate}`;
	document.querySelector("#shopping-rate-value").textContent = `Bs ${formattedRate}`;
	const updatedDate = `${prefix}${new Intl.DateTimeFormat("es-VE", {
		day: "numeric",
		month: "short",
		year: "numeric"
	}).format(new Date(exchangeRate.date))}`;
	document.querySelector("#rate-updated").textContent = updatedDate;
	document.querySelector("#shopping-rate-updated").textContent = updatedDate;
}

function saveProducts(showError = true) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
		return true;
	} catch {
		if (showError) {
			showFeedback("No se pudo guardar en este navegador.", true);
		}
		return false;
	}
}

function saveOrders() {
	try {
		localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
		return true;
	} catch {
		return false;
	}
}

function formatMoney(amount) {
	return currencyFormatter.format(amount);
}

function formatBolivars(amount) {
	return exchangeRate ? `Bs. ${bolivarFormatter.format(amount * exchangeRate.value)}` : "Tasa no disponible";
}

function formatQuantity(amount, maximumFractionDigits = 3) {
	return new Intl.NumberFormat("es-VE", { maximumFractionDigits }).format(amount);
}

function isWeightProduct(product) {
	return product.saleMode === "weight";
}

function formatWeight(grams) {
	return grams >= GRAMS_PER_KILOGRAM
		? `${formatQuantity(grams / GRAMS_PER_KILOGRAM)} kg`
		: `${formatQuantity(grams)} g`;
}

function getStockAmount(product) {
	return isWeightProduct(product) ? product.stock / GRAMS_PER_KILOGRAM : product.stock;
}

function getCartLineTotal(product, quantity) {
	const priceQuantity = isWeightProduct(product) ? quantity / GRAMS_PER_KILOGRAM : quantity;
	return getDiscountedPrice(product.price) * priceQuantity;
}

function getDiscountedPrice(price) {
	return price > DISCOUNT_THRESHOLD ? price * (1 - DISCOUNT_RATE) : price;
}

function showFeedback(message, isError = false) {
	formFeedback.textContent = message;
	formFeedback.classList.toggle("error", isError);
}

function showCatalogFeedback(message, isError = false) {
	catalogFeedback.textContent = message;
	catalogFeedback.classList.toggle("error", isError);
}

function getCartQuantity(productId) {
	return cart.find((item) => item.productId === productId)?.quantity || 0;
}

function getCartTotal() {
	return cart.reduce((total, item) => {
		const product = products.find((entry) => entry.id === item.productId);
		return product ? total + getCartLineTotal(product, item.quantity) : total;
	}, 0);
}

function configureProductFormMode() {
	const isWeight = productSaleModeInput.value === "weight";
	const productBeingEdited = products.find((product) => product.id === editingProductId);
	const legacyWeightCategory = productBeingEdited &&
		["Carnes", "Charcutería"].includes(productBeingEdited.category) &&
		!isWeightProduct(productBeingEdited);
	productPriceLabel.textContent = isWeight ? "Precio (USD/kg)" : "Precio (USD c/u)";
	productStockLabel.textContent = isWeight ? "Existencias iniciales (kg)" : "Cantidad inicial";
	productStockInput.step = isWeight ? "0.001" : "1";
	productStockInput.placeholder = isWeight ? "0.000" : "0";
	productStockGuidance.textContent = isWeight
		? "El precio se cobra por kg y el inventario se guarda en gramos. Puedes elegir g, kg o lb al comprar."
		: legacyWeightCategory
			? "Este producto existente conserva sus unidades actuales. Para venderlo por peso, cambia la forma de venta e ingresa el stock real en kg; no se convertirá automáticamente."
			: "El precio y el inventario se controlan por unidad.";
}

function getStoredStock(stockAmount, saleMode) {
	return saleMode === "weight"
		? Math.round(stockAmount * GRAMS_PER_KILOGRAM)
		: stockAmount;
}

function getWeightQuantityInGrams(amount, unit) {
	const conversion = WEIGHT_UNITS[unit];
	const parsedAmount = Number(amount);
	if (!conversion || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
		return null;
	}
	return Math.round(parsedAmount * conversion.grams);
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
		const weightProduct = isWeightProduct(product);
		const card = document.createElement("article");
		const lowStock = product.stock > 0 && product.stock <= (weightProduct ? 3000 : 3);
		card.className = `product-card${product.stock === 0 ? " product-card-soldout" : ""}`;
		const visual = document.createElement("div");
		const normalizedCategory = product.category.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		visual.className = `product-card-visual category-${normalizedCategory}`;
		visual.setAttribute("aria-hidden", "true");
		visual.textContent = ({ Carnes: "🥩", "Charcutería": "🧀", Víveres: "🛒", Bebidas: "🥤", "Lácteos": "🥛", Otros: "🌿" })[product.category];
		const details = document.createElement("div");
		details.className = "product-card-details";
		const category = document.createElement("span");
		category.className = "product-category-label";
		category.textContent = product.category;
		const status = document.createElement("span");
		status.className = `product-status${product.stock === 0 ? " sold-out" : lowStock ? " low-stock" : ""}`;
		status.textContent = product.stock === 0
			? "Agotado"
			: weightProduct
				? `${formatWeight(product.stock)} disponibles`
				: lowStock
					? `Quedan ${product.stock}`
					: "Disponible";
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
		currentPrice.textContent = `${formatMoney(discountedPrice)}${weightProduct ? " / kg" : ""}`;
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
		quantityInput.className = `buy-quantity${weightProduct ? " weight-quantity" : ""}`;
		quantityInput.type = "number";
		const availableStock = product.stock - getCartQuantity(product.id);
		let unitSelect;
		if (weightProduct) {
			unitSelect = document.createElement("select");
			unitSelect.className = "weight-unit-select";
			unitSelect.setAttribute("aria-label", `Unidad de peso para ${product.name}`);
			for (const unit of ["g", "kg", "lb"]) {
				const option = document.createElement("option");
				option.value = unit;
				option.textContent = unit;
				option.selected = unit === "kg";
				unitSelect.append(option);
			}
			quantityInput.min = WEIGHT_UNITS.kg.minimum;
			quantityInput.step = WEIGHT_UNITS.kg.step;
			quantityInput.max = String(Math.max(0.001, availableStock / GRAMS_PER_KILOGRAM));
			quantityInput.value = String(Math.min(0.25, availableStock / GRAMS_PER_KILOGRAM));
			quantityInput.setAttribute("aria-label", `Peso de ${product.name} para añadir al carrito`);
			unitSelect.addEventListener("change", () => {
				const previousUnit = unitSelect.dataset.previousUnit || "kg";
				const amountInGrams = getWeightQuantityInGrams(quantityInput.value, previousUnit);
				const nextUnit = unitSelect.value;
				const conversion = WEIGHT_UNITS[nextUnit];
				quantityInput.step = conversion.step;
				quantityInput.min = conversion.minimum;
				quantityInput.max = String(Math.max(Number(conversion.minimum), availableStock / conversion.grams));
				quantityInput.value = amountInGrams
					? String(Math.max(Number(conversion.minimum), amountInGrams / conversion.grams))
					: conversion.minimum;
				unitSelect.dataset.previousUnit = nextUnit;
			});
		} else {
			quantityInput.min = "1";
			quantityInput.step = "1";
			quantityInput.max = String(Math.max(1, availableStock));
			quantityInput.value = "1";
			quantityInput.setAttribute("aria-label", `Cantidad de ${product.name} para añadir al carrito`);
		}
		const buyButton = document.createElement("button");
		buyButton.className = "buy-button";
		buyButton.type = "button";
		buyButton.textContent = product.stock === 0 ? "Agotado" : "Añadir al carrito";
		buyButton.disabled = product.stock === 0 || availableStock === 0;
		buyButton.addEventListener("click", () => {
			addToCart(product.id, quantityInput.value, unitSelect?.value);
		});
		controls.append(quantityInput);
		if (unitSelect) {
			controls.append(unitSelect);
		}
		controls.append(buyButton);
		card.append(visual, details, controls);
		catalogProducts.append(card);
	}

	emptyState.hidden = products.length > 0;
	noResults.hidden = products.length === 0 || visibleProducts.length > 0;
	renderAdminProducts();
	document.querySelector("#product-count").textContent = String(products.length);
	const unitStock = products
		.filter((product) => !isWeightProduct(product))
		.reduce((total, product) => total + product.stock, 0);
	const weightStock = products
		.filter(isWeightProduct)
		.reduce((total, product) => total + product.stock, 0);
	document.querySelector("#unit-count").textContent = [
		unitStock ? `${unitStock} uds` : "",
		weightStock ? formatWeight(weightStock) : ""
	].filter(Boolean).join(" · ") || "0";
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
		products.reduce((total, product) => total + getCartLineTotal(product, product.stock), 0)
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
			(filter === "low" && product.stock > 0 && product.stock <= (isWeightProduct(product) ? 3000 : 3));
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
		priceCell.textContent = `${formatMoney(product.price)}${isWeightProduct(product) ? " / kg" : " c/u"}`;
		const stockCell = document.createElement("td");
		const stockInput = document.createElement("input");
		stockInput.className = "stock-edit-input";
		stockInput.type = "number";
		stockInput.min = "0";
		stockInput.step = isWeightProduct(product) ? "0.001" : "1";
		stockInput.value = String(getStockAmount(product));
		stockInput.setAttribute("aria-label", `Existencias de ${product.name}${isWeightProduct(product) ? " en kg" : " en unidades"}`);
		stockCell.append(stockInput);
		const actionCell = document.createElement("td");
		const actionWrap = document.createElement("div");
		actionWrap.className = "inventory-actions";
		const status = document.createElement("span");
		const lowStock = product.stock > 0 && product.stock <= (isWeightProduct(product) ? 3000 : 3);
		status.className = `stock-pill${lowStock ? " low" : ""}`;
		status.textContent = product.stock === 0 ? "Agotado" : lowStock ? "Stock bajo" : "En stock";
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

function getOrderDisplayId(order) {
	return `#${order.id.slice(-6).toLocaleUpperCase("es")}`;
}

function getOrderStatusLabel(status) {
	return {
		pending: "Por aceptar",
		accepted: "En preparación",
		completed: "Completado",
		rejected: "Rechazado"
	}[status] || "Pedido";
}

function getLocalDateInputValue(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function createOrderReviewForm(order) {
	const form = document.createElement("form");
	form.className = "sales-order-review";
	form.dataset.orderReview = "";
	form.dataset.orderId = order.id;

	const heading = document.createElement("h3");
	heading.textContent = order.review ? "Tu reseña" : "¿Cuándo recibiste tu pedido?";
	const dateLabel = document.createElement("label");
	dateLabel.className = "sales-review-label";
	dateLabel.textContent = "Fecha de recepción";
	const dateInput = document.createElement("input");
	dateInput.className = "sales-review-date";
	dateInput.type = "date";
	dateInput.name = "receivedAt";
	dateInput.min = getLocalDateInputValue(new Date(order.createdAt));
	dateInput.max = getLocalDateInputValue(new Date());
	dateInput.value = order.review?.receivedAt || "";
	dateInput.required = true;
	dateLabel.append(dateInput);

	const ratingFieldset = document.createElement("fieldset");
	ratingFieldset.className = "sales-review-rating";
	const ratingLegend = document.createElement("legend");
	ratingLegend.textContent = "Califica tu experiencia";
	ratingFieldset.append(ratingLegend);
	for (let rating = 1; rating <= 5; rating += 1) {
		const label = document.createElement("label");
		label.className = "sales-review-star";
		const input = document.createElement("input");
		input.type = "radio";
		input.name = `rating-${order.id}`;
		input.value = String(rating);
		input.setAttribute("aria-label", `${rating} ${rating === 1 ? "estrella" : "estrellas"}`);
		input.required = true;
		input.checked = order.review?.rating === rating;
		const star = document.createElement("span");
		star.setAttribute("aria-hidden", "true");
		star.textContent = "★";
		if (order.review?.rating >= rating) {
			label.classList.add("selected");
		}
		label.append(input, star);
		ratingFieldset.append(label);
	}

	const reasonLabel = document.createElement("label");
	reasonLabel.className = "sales-review-label sales-review-reason";
	reasonLabel.textContent = "Cuéntanos qué salió mal (obligatorio para 1 o 2 estrellas)";
	const reasonInput = document.createElement("textarea");
	reasonInput.name = "reason";
	reasonInput.rows = 3;
	reasonInput.maxLength = 500;
	reasonInput.placeholder = "Escribe el motivo de tu calificación";
	reasonInput.value = order.review?.reason || "";
	reasonInput.required = order.review?.rating <= 2;
	reasonLabel.hidden = !reasonInput.required;
	reasonLabel.append(reasonInput);

	const submit = document.createElement("button");
	submit.className = "primary-button";
	submit.type = "submit";
	submit.textContent = order.review ? "Actualizar reseña" : "Guardar reseña";
	form.append(heading, dateLabel, ratingFieldset, reasonLabel, submit);
	return form;
}

function renderSales() {
	const pendingOrders = orders.filter((order) => order.status === "pending");
	const acceptedOrders = orders.filter((order) => order.status === "accepted");
	const completedOrders = orders.filter((order) => order.status === "completed");
	const revenueOrders = orders.filter((order) => ["accepted", "completed"].includes(order.status));
	document.querySelector("#sales-pending-count").textContent = String(pendingOrders.length);
	document.querySelector("#sales-accepted-count").textContent = String(acceptedOrders.length);
	document.querySelector("#sales-completed-count").textContent = String(completedOrders.length);
	document.querySelector("#sales-revenue").textContent = formatMoney(
		revenueOrders.reduce((total, order) => total + order.total, 0)
	);
	pendingOrderCount.textContent = String(pendingOrders.length);
	pendingOrderCount.hidden = pendingOrders.length === 0;

	const visibleOrders = orders.filter((order) =>
		salesStatusFilter.value === "all" || order.status === salesStatusFilter.value
	);
	salesOrdersList.replaceChildren();
	for (const order of visibleOrders) {
		const card = document.createElement("article");
		card.className = `sales-order-card sales-order-${order.status}`;
		const header = document.createElement("div");
		header.className = "sales-order-header";
		const heading = document.createElement("div");
		heading.className = "sales-order-heading";
		const id = document.createElement("strong");
		id.className = "sales-order-id";
		id.textContent = `Pedido ${getOrderDisplayId(order)}`;
		const timestamp = document.createElement("time");
		timestamp.className = "sales-order-time";
		timestamp.dateTime = order.createdAt;
		timestamp.textContent = new Intl.DateTimeFormat("es-VE", {
			day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
		}).format(new Date(order.createdAt));
		heading.append(id, timestamp);
		const status = document.createElement("span");
		status.className = `sales-order-status status-${order.status}`;
		status.textContent = getOrderStatusLabel(order.status);
		header.append(heading, status);

		const details = document.createElement("div");
		details.className = "sales-order-details";
		const method = document.createElement("span");
		method.textContent = `Pago: ${order.paymentMethod}`;
		const fulfillment = document.createElement("span");
		fulfillment.textContent = order.delivery?.location
			? "Delivery por coordinar"
			: "Retiro en tienda";
		details.append(method, fulfillment);

		const itemList = document.createElement("ul");
		itemList.className = "sales-order-items";
		for (const item of order.items) {
			const itemRow = document.createElement("li");
			const itemName = document.createElement("span");
			itemName.className = "sales-order-item-name";
			itemName.textContent = item.name;
			const itemDescription = document.createElement("small");
			itemDescription.textContent = item.saleMode === "weight"
				? `${formatWeight(item.quantity)} × ${formatMoney(item.price)}/kg`
				: `${formatQuantity(item.quantity, 0)} × ${formatMoney(item.price)}`;
			const itemPrice = document.createElement("strong");
			itemPrice.textContent = formatMoney(item.lineTotal);
			const itemCopy = document.createElement("span");
			itemCopy.className = "sales-order-item-copy";
			itemCopy.append(itemName, itemDescription);
			itemRow.append(itemCopy, itemPrice);
			itemList.append(itemRow);
		}

		const footer = document.createElement("div");
		footer.className = "sales-order-footer";
		const totalWrap = document.createElement("div");
		totalWrap.className = "sales-order-total-wrap";
		const totalLabel = document.createElement("span");
		totalLabel.textContent = order.delivery?.fee ? "Total · incluye delivery" : "Total del pedido";
		const total = document.createElement("strong");
		total.textContent = formatMoney(order.total);
		totalWrap.append(totalLabel, total);
		const actions = document.createElement("div");
		actions.className = "sales-order-actions";
		if (order.status === "pending") {
			actions.append(
				createOrderAction(order.id, "reject", "Rechazar", "sales-reject-button"),
				createOrderAction(order.id, "accept", "Aceptar pedido", "sales-accept-button")
			);
		} else if (order.status === "accepted") {
			actions.append(createOrderAction(order.id, "complete", "Marcar como completado", "sales-accept-button"));
		}
		footer.append(totalWrap, actions);
		card.append(header, details, itemList);
		if (order.delivery?.location) {
			const address = document.createElement("p");
			address.className = "sales-order-address";
			address.textContent = `Entrega: ${order.delivery.location}`;
			card.append(address);
		}
		if (order.status === "completed") {
			card.append(createOrderReviewForm(order));
		}
		card.append(footer);
		salesOrdersList.append(card);
	}
	salesEmptyState.hidden = orders.length > 0;
	salesOrdersList.hidden = visibleOrders.length === 0;
	salesFilterEmpty.hidden = orders.length === 0 || visibleOrders.length > 0;
}

function createOrderAction(orderId, action, label, className) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = className;
	button.dataset.orderId = orderId;
	button.dataset.orderAction = action;
	button.textContent = label;
	return button;
}

function updateOrderStatus(orderId, nextStatus) {
	const order = orders.find((entry) => entry.id === orderId);
	if (!order || !(
		(order.status === "pending" && ["accepted", "rejected"].includes(nextStatus)) ||
		(order.status === "accepted" && nextStatus === "completed")
	)) {
		return;
	}

	const previousStatus = order.status;
	const previousStocks = [];
	if (nextStatus === "accepted") {
		for (const item of order.items) {
			const product = products.find((entry) => entry.id === item.productId);
			if (!product || product.stock < item.quantity) {
				salesFeedback.textContent = `No se pudo aceptar ${getOrderDisplayId(order)}: faltan existencias para ${item.name}. Revisa el inventario.`;
				return;
			}
			previousStocks.push({ product, stock: product.stock });
		}
		for (const item of order.items) {
			products.find((entry) => entry.id === item.productId).stock -= item.quantity;
		}
		if (!saveProducts(false)) {
			for (const { product, stock } of previousStocks) {
				product.stock = stock;
			}
			salesFeedback.textContent = "No se pudo guardar el inventario en este navegador; el pedido sigue pendiente.";
			return;
		}
	}

	order.status = nextStatus;
	if (!saveOrders()) {
		order.status = previousStatus;
		for (const { product, stock } of previousStocks) {
			product.stock = stock;
		}
		if (previousStocks.length > 0) {
			saveProducts(false);
		}
		salesFeedback.textContent = "No se pudo guardar el cambio en este navegador. Inténtalo de nuevo.";
		return;
	}

	salesFeedback.textContent = nextStatus === "accepted"
		? `${getOrderDisplayId(order)} aceptado. El inventario se actualizó.`
		: nextStatus === "rejected"
			? `${getOrderDisplayId(order)} rechazado.`
			: `${getOrderDisplayId(order)} marcado como completado.`;
	if (nextStatus === "accepted") {
		renderProducts();
	}
	renderSales();
}

function beginProductEdit(product) {
	editingProductId = product.id;
	lastSuggestedProductCategory = null;
	productNameInput.value = product.name;
	productCategoryInput.value = product.category;
	productCategoryHint.textContent = "La categoría no cambiará automáticamente mientras editas.";
	productSaleModeInput.value = product.saleMode;
	productPriceInput.value = String(product.price);
	productStockInput.value = String(getStockAmount(product));
	configureProductFormMode();
	document.querySelector("#submit-product-button").textContent = "✓ Guardar cambios";
	document.querySelector("#cancel-edit-button").hidden = false;
	showFeedback(`Editando ${product.name}.`);
	productForm.scrollIntoView({ behavior: "smooth", block: "center" });
	productNameInput.focus();
}

function cancelProductEdit() {
	editingProductId = null;
	lastSuggestedProductCategory = null;
	productForm.reset();
	productCategoryHint.textContent = "";
	configureProductFormMode();
	document.querySelector("#submit-product-button").textContent = "＋ Agregar al inventario";
	document.querySelector("#cancel-edit-button").hidden = true;
	formFeedback.textContent = "";
	formFeedback.classList.remove("error");
}

function updateProductStock(productId, requestedStock) {
	const product = products.find((item) => item.id === productId);
	const amount = Number(requestedStock);
	const weightProduct = product && isWeightProduct(product);
	const stock = weightProduct ? getStoredStock(amount, "weight") : amount;
	if (!product || !Number.isFinite(amount) || amount < 0 ||
		(weightProduct
			? Math.abs(amount * GRAMS_PER_KILOGRAM - stock) > 1e-6
			: !Number.isInteger(stock))) {
		showFeedback(weightProduct
			? "Ingresa existencias en kg con hasta tres decimales."
			: "La existencia debe ser un número entero igual o mayor que cero.", true);
		return;
	}
	if (editingProductId === product.id) {
		cancelProductEdit();
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
	if (!product) {
		return;
	}
	pendingDeleteProductId = productId;
	deleteConfirmProductName.textContent = `“${product.name}”`;
	deleteConfirmDialog.showModal();
}

function confirmProductDeletion() {
	const product = products.find((item) => item.id === pendingDeleteProductId);
	pendingDeleteProductId = null;
	deleteConfirmDialog.close();
	if (!product) {
		return;
	}
	if (editingProductId === product.id) {
		cancelProductEdit();
	}
	products = products.filter((item) => item.id !== product.id);
	cart = cart.filter((item) => item.productId !== product.id);
	saveProducts();
	showFeedback(`${product.name} fue eliminado del inventario.`);
	renderProducts();
	renderCart();
}

function addToCart(productId, requestedQuantity, weightUnit) {
	const product = products.find((item) => item.id === productId);
	const quantity = product && isWeightProduct(product)
		? getWeightQuantityInGrams(requestedQuantity, weightUnit)
		: Number(requestedQuantity);
	const alreadyInCart = getCartQuantity(productId);
	if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity + alreadyInCart > product.stock) {
		showCatalogFeedback(product && isWeightProduct(product)
			? `Indica un peso válido, en existencias y mayor a 1 g (${formatWeight(Math.max(0, product.stock - alreadyInCart))} disponibles).`
			: "La cantidad supera las unidades disponibles.", true);
		return;
	}

	const cartItem = cart.find((item) => item.productId === productId);
	if (cartItem) {
		cartItem.quantity += quantity;
	} else {
		cart.push({ productId, quantity });
	}
	showCatalogFeedback(`${product.name} añadido al carrito.`);
	renderCart();
	renderProducts();
}


function updateCartQuantity(productId, requestedQuantity, weightUnit) {
	const product = products.find((item) => item.id === productId);
	const quantity = product && isWeightProduct(product)
		? getWeightQuantityInGrams(requestedQuantity, weightUnit)
		: Number(requestedQuantity);
	if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
		renderCart();
		showCatalogFeedback(product && isWeightProduct(product)
			? `El peso indicado no es válido o supera las existencias de ${formatWeight(product?.stock || 0)}.`
			: "La cantidad indicada supera las unidades disponibles.", true);
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

	for (const item of cart) {
		const product = products.find((entry) => entry.id === item.productId);
		if (!product) {
			continue;
		}
		const weightProduct = isWeightProduct(product);
		const lineTotal = getCartLineTotal(product, item.quantity);
		const line = document.createElement("li");
		line.className = "cart-item";
		const info = document.createElement("div");
		info.className = "cart-item-info";
		const name = document.createElement("span");
		name.className = "cart-item-name";
		name.textContent = product.name;
		const linePrice = document.createElement("span");
		linePrice.className = "cart-item-price";
		linePrice.textContent = weightProduct
			? `${formatMoney(getDiscountedPrice(product.price))}/kg · ${formatWeight(item.quantity)} · ${formatMoney(lineTotal)} · ${formatBolivars(lineTotal)}`
			: `${formatMoney(getDiscountedPrice(product.price))} c/u · ${formatMoney(lineTotal)} · ${formatBolivars(lineTotal)}`;
		info.append(name, linePrice);

		const controls = document.createElement("div");
		controls.className = `cart-item-controls${weightProduct ? " cart-weight-controls" : ""}`;
		const quantityInput = document.createElement("input");
		quantityInput.className = `cart-item-quantity${weightProduct ? " weight-quantity" : ""}`;
		quantityInput.type = "number";
		let unitSelect;
		if (weightProduct) {
			unitSelect = document.createElement("select");
			unitSelect.className = "weight-unit-select cart-weight-unit-select";
			unitSelect.setAttribute("aria-label", `Unidad de peso de ${product.name} en el carrito`);
			for (const unit of ["g", "kg", "lb"]) {
				const option = document.createElement("option");
				option.value = unit;
				option.textContent = unit;
				option.selected = unit === "kg";
				unitSelect.append(option);
			}
			quantityInput.min = WEIGHT_UNITS.kg.minimum;
			quantityInput.step = WEIGHT_UNITS.kg.step;
			quantityInput.max = String(Math.max(0.001, product.stock / GRAMS_PER_KILOGRAM));
			quantityInput.value = String(item.quantity / GRAMS_PER_KILOGRAM);
			quantityInput.setAttribute("aria-label", `Peso de ${product.name} en el carrito`);
			unitSelect.addEventListener("change", () => {
				const previousUnit = unitSelect.dataset.previousUnit || "kg";
				const amountInGrams = getWeightQuantityInGrams(quantityInput.value, previousUnit);
				const nextUnit = unitSelect.value;
				const conversion = WEIGHT_UNITS[nextUnit];
				quantityInput.step = conversion.step;
				quantityInput.min = conversion.minimum;
				quantityInput.max = String(Math.max(Number(conversion.minimum), product.stock / conversion.grams));
				quantityInput.value = amountInGrams
					? String(Math.max(Number(conversion.minimum), amountInGrams / conversion.grams))
					: conversion.minimum;
				unitSelect.dataset.previousUnit = nextUnit;
			});
		} else {
			quantityInput.min = "1";
			quantityInput.step = "1";
			quantityInput.max = String(product.stock);
			quantityInput.value = String(item.quantity);
			quantityInput.setAttribute("aria-label", `Cantidad de ${product.name} en el carrito`);
		}
		quantityInput.addEventListener("change", () => updateCartQuantity(product.id, quantityInput.value, unitSelect?.value));
		unitSelect?.addEventListener("change", () => updateCartQuantity(product.id, quantityInput.value, unitSelect.value));
		const removeButton = document.createElement("button");
		removeButton.className = "remove-item";
		removeButton.type = "button";
		removeButton.textContent = "×";
		removeButton.title = `Quitar ${product.name} del carrito`;
		removeButton.setAttribute("aria-label", `Quitar ${product.name} del carrito`);
		removeButton.addEventListener("click", () => removeFromCart(product.id));
		controls.append(quantityInput);
		if (unitSelect) {
			controls.append(unitSelect);
		}
		controls.append(removeButton);
		line.append(info, controls);
		cartItems.append(line);
	}

	const total = getOrderTotal();
	cartCount.textContent = String(cart.length);
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
	deliveryFeedback.textContent = "";
	checkoutFeedback.textContent = "";
	checkoutForm.reset();
	checkoutForm.querySelectorAll(".payment-details").forEach((details) => {
		details.hidden = true;
	});
	checkoutTotal.textContent = formatMoney(getOrderTotal());
	document.querySelector("#checkout-total-bs").textContent = formatBolivars(getOrderTotal());
	checkoutDelivery.hidden = !deliveryToggle.checked;
	checkoutDelivery.textContent = deliveryToggle.checked
		? `Delivery · ${getDeliveryLocation()} · ${formatMoney(deliveryFee)} (${formatBolivars(deliveryFee)}) · Coordina la entrega directamente con la tienda.`
		: "";
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
		const isShortGoogleMapsLink = hostname === "maps.app.goo.gl" ||
			hostname === "goo.gl" && url.pathname.startsWith("/maps");
		const isRegionalGoogleMapsLink = /^(?:(?:www\.)?google|maps\.google)\.(?:com(?:\.[a-z]{2})?|[a-z]{2,3}(?:\.[a-z]{2})?)$/.test(hostname) &&
			(hostname.startsWith("maps.google.") || url.pathname.startsWith("/maps"));
		const isGoogleMaps = isShortGoogleMapsLink || isRegionalGoogleMapsLink;
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
		const coordinates = getCoordinatesFromMapLink(mapLink);
		if (coordinates) {
			return `${coordinates.latitude},${coordinates.longitude}`;
		}
		try {
			const url = new URL(mapLink);
			const search = url.searchParams.get("query") || url.searchParams.get("q");
			if (search && !search.includes("://")) {
				return search;
			}
		} catch {
			return deliveryAddress.value.trim();
		}
	}
	return deliveryAddress.value.trim();
}

function getCoordinatesFromMapLink(mapLink) {
	const patterns = [
		/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
		/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
		/[?&](?:query|q)=(-?\d+(?:\.\d+)?)(?:%2c|,|\s)+(-?\d+(?:\.\d+)?)/i
	];
	for (const pattern of patterns) {
		const match = mapLink.match(pattern);
		if (match) {
			const latitude = Number(match[1]);
			const longitude = Number(match[2]);
			if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
				return { latitude, longitude };
			}
		}
	}
	return null;
}

function updateDeliveryMap() {
	const coordinates = deliveryCoordinates || getCoordinatesFromMapLink(getValidatedMapLink());
	const mapLink = getValidatedMapLink();
	const searchQuery = coordinates
		? `${coordinates.latitude},${coordinates.longitude}`
		: deliveryAddress.value.trim();
	if (mapLink && !coordinates) {
		deliveryMapLinkPreview.href = mapLink;
		deliveryMapLinkPreview.hidden = false;
	} else if (searchQuery) {
		const mapUrl = new URL("https://www.google.com/maps/search/");
		mapUrl.searchParams.set("api", "1");
		mapUrl.searchParams.set("query", searchQuery);
		deliveryMapLinkPreview.href = mapUrl.href;
		deliveryMapLinkPreview.hidden = false;
	} else {
		deliveryMapLinkPreview.removeAttribute("href");
		deliveryMapLinkPreview.hidden = true;
	}
}

function openMapPicker() {
	mapSuggestionRequestId++;
	hideMapSuggestions();
	mapPickerCoordinates = deliveryCoordinates
		? { ...deliveryCoordinates }
		: getCoordinatesFromMapLink(getValidatedMapLink());
	mapPickerInput.value = deliveryCoordinates
		? `${deliveryCoordinates.latitude.toFixed(6)}, ${deliveryCoordinates.longitude.toFixed(6)}`
		: mapPickerCoordinates
			? `${mapPickerCoordinates.latitude}, ${mapPickerCoordinates.longitude}`
			: deliveryAddress.value.trim() || getMapSearchQuery();
	mapPickerFeedback.textContent = mapPickerInput.value
		? "Busca la dirección y marca el punto exacto en el mapa."
		: "Busca una dirección o toca el mapa para colocar el pin.";
	mapPickerDialog.showModal();
	void updateMapPicker();
	window.setTimeout(() => {
		if (mapPickerMap) {
			const mapCenter = mapPickerCoordinates || DELIVERY_ORIGIN;
			if (mapPickerProvider === "google") {
				window.google.maps.event.trigger(mapPickerMap, "resize");
				mapPickerMap.setCenter({ lat: mapCenter.latitude, lng: mapCenter.longitude });
				mapPickerMap.setZoom(mapPickerCoordinates ? 16 : 12);
			} else {
				mapPickerMap.invalidateSize({ pan: false });
				mapPickerMap.setView(
					[mapCenter.latitude, mapCenter.longitude],
					mapPickerCoordinates ? 16 : 12,
					{ animate: false }
				);
			}
			loadNearbyPlaces();
		}
	}, 100);
}

function loadGoogleMapsApi() {
	if (window.google?.maps?.importLibrary) {
		return Promise.resolve(window.google.maps);
	}
	if (!window.GOOGLE_MAPS_API_KEY) {
		return Promise.reject(new Error("No hay una clave de Google Maps configurada."));
	}
	if (googleMapsApiPromise) {
		return googleMapsApiPromise;
	}
	googleMapsApiPromise = new Promise((resolve, reject) => {
		const callbackName = `laTienditaGoogleMapsLoaded${Date.now()}`;
		const timeoutId = window.setTimeout(() => {
			delete window[callbackName];
			googleMapsApiPromise = null;
			reject(new Error("Google Maps tardó demasiado en responder."));
		}, 15000);
		window[callbackName] = () => {
			window.clearTimeout(timeoutId);
			delete window[callbackName];
			resolve(window.google.maps);
		};
		const script = document.createElement("script");
		const scriptUrl = new URL("https://maps.googleapis.com/maps/api/js");
		scriptUrl.searchParams.set("key", window.GOOGLE_MAPS_API_KEY);
		scriptUrl.searchParams.set("v", "weekly");
		scriptUrl.searchParams.set("loading", "async");
		scriptUrl.searchParams.set("callback", callbackName);
		script.addEventListener("error", () => {
			window.clearTimeout(timeoutId);
			delete window[callbackName];
			googleMapsApiPromise = null;
			reject(new Error("No se pudo cargar Google Maps."));
		}, { once: true });
		script.src = scriptUrl.href;
		document.head.append(script);
	});
	return googleMapsApiPromise;
}

window.gm_authFailure = () => {
	mapPickerFeedback.textContent = "Google Maps rechazó la clave. Verifica las API habilitadas y la restricción del dominio.";
	mapBusinessFeedback.textContent = "No se pudieron cargar los comercios de Google Maps.";
};

async function initializeGoogleMap() {
	await loadGoogleMapsApi();
	const { Map } = await window.google.maps.importLibrary("maps");
	const center = mapPickerCoordinates || DELIVERY_ORIGIN;
	mapPickerMap = new Map(mapPickerMapElement, {
		center: { lat: center.latitude, lng: center.longitude },
		zoom: mapPickerCoordinates ? 16 : 12,
		mapTypeControl: false,
		streetViewControl: false,
		fullscreenControl: false
	});
	mapPickerProvider = "google";
	mapPickerMarker = new window.google.maps.Marker({
		map: mapPickerCoordinates ? mapPickerMap : null,
		position: { lat: center.latitude, lng: center.longitude },
		draggable: true
	});
	mapPickerMarker.addListener("dragend", () => {
		const position = mapPickerMarker.getPosition();
		if (position) {
			void setMapPickerSelection({ lat: position.lat(), lng: position.lng() }, true);
		}
	});
	mapPickerMap.addListener("click", (event) => {
		if (event.placeId) {
			event.stop();
			void selectGooglePlace(event.placeId);
		} else if (event.latLng) {
			void setMapPickerSelection({ lat: event.latLng.lat(), lng: event.latLng.lng() }, true);
		}
	});
	mapPickerMap.addListener("idle", scheduleNearbyPlacesSearch);
	mapBusinessFeedback.textContent = "Google Maps muestra los comercios y lugares registrados en esta zona.";
}

async function updateMapPicker() {
	if (!mapPickerMap) {
		if (window.GOOGLE_MAPS_API_KEY) {
			try {
				await initializeGoogleMap();
			} catch (error) {
				mapPickerFeedback.textContent = `Google Maps no está disponible: ${error.message} Se usará el mapa alternativo.`;
			}
		}
		if (!mapPickerMap) {
			if (!window.L) {
				mapPickerFeedback.textContent = "El mapa interactivo no está disponible. Revisa tu conexión y abre La Tiendita desde localhost o un sitio HTTPS.";
				return;
			}
			mapPickerMap = L.map(mapPickerMapElement, { scrollWheelZoom: true }).setView([DELIVERY_ORIGIN.latitude, DELIVERY_ORIGIN.longitude], 12);
			mapPickerProvider = "leaflet";
			const tileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
				maxZoom: 19,
				attribution: "Tiles &copy; Esri"
			}).addTo(mapPickerMap);
			mapPlacesLayer = L.layerGroup().addTo(mapPickerMap);
			mapPickerMap.on("moveend", scheduleNearbyPlacesSearch);
			loadNearbyPlaces();
			tileLayer.once("tileerror", () => {
				mapPickerFeedback.textContent = "No se pudieron cargar las calles del mapa. Prueba de nuevo o busca la dirección y confirma el pin.";
			});
			mapPickerMap.on("click", (event) => setMapPickerSelection(event.latlng, true));
			if (!window.GOOGLE_MAPS_API_KEY) {
				mapBusinessFeedback.textContent = "Sin clave de Google, se muestran los comercios disponibles en los datos abiertos.";
			}
		}
	}
	if (mapPickerCoordinates) {
		if (mapPickerProvider === "google") {
			const position = { lat: mapPickerCoordinates.latitude, lng: mapPickerCoordinates.longitude };
			mapPickerMap.setCenter(position);
			mapPickerMap.setZoom(16);
			mapPickerMarker.setPosition(position);
			mapPickerMarker.setMap(mapPickerMap);
		} else {
			mapPickerMap.setView([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude], 16);
			if (mapPickerMarker) {
				mapPickerMarker.setLatLng([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude]);
			} else {
				mapPickerMarker = L.marker([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude], { draggable: true }).addTo(mapPickerMap);
				mapPickerMarker.on("dragend", () => setMapPickerSelection(mapPickerMarker.getLatLng(), true));
			}
		}
	} else if (mapPickerInput.value.trim()) {
		void searchMapLocation();
	}
	document.querySelector("#map-picker-selection-summary").textContent = mapPickerCoordinates
		? "Punto marcado en el mapa"
		: "Toca el mapa para colocar el pin";
	document.querySelector("#map-picker-coordinates").textContent = mapPickerCoordinates
		? `${mapPickerCoordinates.latitude.toFixed(6)}, ${mapPickerCoordinates.longitude.toFixed(6)}`
		: "";
	document.querySelector("#open-map-picker-google").href = mapPickerCoordinates
		? `https://www.google.com/maps/search/?api=1&query=${mapPickerCoordinates.latitude},${mapPickerCoordinates.longitude}`
		: getValidatedMapLink() || "https://www.google.com/maps";
}

function scheduleNearbyPlacesSearch() {
	window.clearTimeout(mapPlacesSearchTimer);
	mapPlacesSearchTimer = window.setTimeout(loadNearbyPlaces, 500);
}

function isNearbyBusiness(feature) {
	const { osm_key: key, osm_value: value, name } = feature.properties;
	if (!name || ["highway", "building", "place", "boundary", "natural", "landuse"].includes(key)) {
		return false;
	}
	if (["shop", "office", "craft", "tourism", "leisure", "healthcare", "emergency"].includes(key)) {
		return true;
	}
	return key === "amenity" && !["bench", "waste_basket", "waste_disposal", "bicycle_parking", "parking_space"].includes(value);
}

function createBusinessPopup(feature) {
	const content = document.createElement("div");
	const name = document.createElement("strong");
	name.textContent = feature.properties.name;
	content.append(name);
	const category = [feature.properties.osm_key, feature.properties.osm_value]
		.filter(Boolean)
		.join(" · ");
	if (category) {
		const detail = document.createElement("div");
		detail.textContent = category;
		content.append(detail);
	}
	return content;
}

async function loadNearbyPlaces() {
	if (!mapPickerMap) {
		return;
	}
	if (mapPickerProvider === "google") {
		mapBusinessFeedback.textContent = "Google Maps muestra los comercios y lugares registrados en esta zona.";
		return;
	}
	if (!mapPlacesLayer || mapPickerMap.getZoom() < 12) {
		mapBusinessFeedback.textContent = "Acércate al mapa para ver comercios y servicios cercanos.";
		return;
	}
	const requestId = ++mapPlacesRequestId;
	const center = mapPickerMap.getCenter();
	const bounds = mapPickerMap.getBounds();
	const centerLabel = `${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}`;
	mapBusinessFeedback.textContent = "Buscando comercios y servicios cercanos...";
	try {
		const placesUrl = new URL("https://photon.komoot.io/reverse");
		placesUrl.searchParams.set("lat", String(center.lat));
		placesUrl.searchParams.set("lon", String(center.lng));
		placesUrl.searchParams.set("limit", "50");
		const response = await fetch(placesUrl, { headers: { Accept: "application/json" } });
		if (!response.ok) {
			throw new Error("No se pudieron cargar los comercios cercanos.");
		}
		const data = await response.json();
		if (requestId !== mapPlacesRequestId || centerLabel !== `${mapPickerMap.getCenter().lat.toFixed(3)}, ${mapPickerMap.getCenter().lng.toFixed(3)}`) {
			return;
		}
		if (!Array.isArray(data.features)) {
			throw new Error("La respuesta de comercios no es válida.");
		}
		const businesses = data.features.filter((feature) => {
			const [longitude, latitude] = feature.geometry.coordinates;
			return isNearbyBusiness(feature) && bounds.contains([latitude, longitude]);
		});
		mapPlacesLayer.clearLayers();
		for (const feature of businesses) {
			const [longitude, latitude] = feature.geometry.coordinates;
			const popup = createBusinessPopup(feature);
			L.circleMarker([latitude, longitude], {
				radius: 7,
				color: "#ffffff",
				weight: 2,
				fillColor: "#e67d5e",
				fillOpacity: 1
			})
				.bindPopup(popup)
				.addTo(mapPlacesLayer)
				.on("click", () => setMapPickerSelection({ lat: latitude, lng: longitude }));
		}
		mapBusinessFeedback.textContent = businesses.length
			? `${businesses.length} comercios y servicios cercanos en esta zona. Toca un marcador para elegirlo.`
			: "No hay comercios registrados en los datos abiertos de esta zona.";
	} catch {
		if (requestId === mapPlacesRequestId) {
			mapBusinessFeedback.textContent = "No se pudieron cargar los comercios. Puedes seguir marcando el punto en el mapa.";
		}
	}
}

function hideMapSuggestions() {
	mapPickerSuggestions.hidden = true;
	mapPickerSuggestions.replaceChildren();
	mapPickerInput.setAttribute("aria-expanded", "false");
	mapPickerInput.removeAttribute("aria-activedescendant");
	mapSuggestionItems = [];
	googlePlacePredictions = [];
	activeMapSuggestionIndex = -1;
}

function formatMapSuggestion(properties) {
	const street = [properties.housenumber, properties.street].filter(Boolean).join(" ");
	return [...new Set([
		properties.name,
		street,
		properties.district,
		properties.city,
		properties.county,
		properties.state,
		properties.country
	].filter(Boolean))].join(", ");
}

async function searchMapLocation() {
	if (!mapPickerMap) {
		mapPickerFeedback.textContent = "El mapa todavía no está listo. Cierra y vuelve a abrir el selector cuando tengas conexión.";
		return;
	}
	const query = mapPickerInput.value.trim();
	if (!query) {
		mapPickerFeedback.textContent = "Escribe una dirección o lugar para buscar.";
		return;
	}
	if (query.length < 3) {
		hideMapSuggestions();
		mapPickerFeedback.textContent = "Escribe al menos 3 caracteres para buscar lugares.";
		return;
	}
	const requestId = ++mapSuggestionRequestId;
	mapPickerFeedback.textContent = "Buscando lugares...";
	try {
		if (mapPickerProvider === "google") {
			const { AutocompleteSuggestion, AutocompleteSessionToken } = await window.google.maps.importLibrary("places");
			googleAutocompleteSessionToken ||= new AutocompleteSessionToken();
			const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
				input: query,
				locationBias: mapPickerMap.getBounds() || undefined,
				sessionToken: googleAutocompleteSessionToken
			});
			if (requestId !== mapSuggestionRequestId || query !== mapPickerInput.value.trim()) {
				return;
			}
			googlePlacePredictions = suggestions
				.map((suggestion) => suggestion.placePrediction)
				.filter(Boolean);
			mapSuggestionItems = googlePlacePredictions.map((prediction) => ({
				label: prediction.text.toString(),
				googlePlace: true
			}));
			if (mapSuggestionItems.length === 0) {
				hideMapSuggestions();
				mapPickerFeedback.textContent = "Google Maps no encontró ese lugar. Prueba otra búsqueda o marca el punto.";
				return;
			}
			renderMapSuggestions();
			mapPickerFeedback.textContent = "Elige un lugar de Google Maps para colocar el pin.";
			return;
		}
		const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`, {
			headers: { Accept: "application/json" }
		});
		if (!response.ok) {
			throw new Error("Búsqueda no disponible");
		}
		const data = await response.json();
		if (requestId !== mapSuggestionRequestId || query !== mapPickerInput.value.trim()) {
			return;
		}
		if (!Array.isArray(data.features)) {
			throw new Error("La respuesta de búsqueda no es válida.");
		}
		mapSuggestionItems = data.features
			.map((feature) => ({
				label: formatMapSuggestion(feature.properties),
				latitude: Number(feature.geometry.coordinates[1]),
				longitude: Number(feature.geometry.coordinates[0])
			}))
			.filter((place) => place.label && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
		if (mapSuggestionItems.length === 0) {
			hideMapSuggestions();
			mapPickerFeedback.textContent = "No encontramos ese lugar. Prueba otra dirección o toca el mapa.";
			return;
		}
		renderMapSuggestions();
		mapPickerFeedback.textContent = "Elige una dirección de la lista para colocar el pin.";
	} catch (error) {
		if (requestId !== mapSuggestionRequestId) {
			return;
		}
		hideMapSuggestions();
		mapPickerFeedback.textContent = error instanceof TypeError
			? "No se pudieron cargar sugerencias. Revisa la conexión o marca el punto directamente en el mapa."
			: `No se pudo buscar la dirección: ${error.message}`;
	}
}

function renderMapSuggestions() {
	activeMapSuggestionIndex = -1;
	mapPickerSuggestions.replaceChildren(...mapSuggestionItems.map((place, index) => {
		const option = document.createElement("li");
		option.id = `map-picker-suggestion-${index}`;
		option.setAttribute("role", "option");
		option.setAttribute("aria-selected", "false");
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = place.label;
		button.addEventListener("pointerdown", (event) => event.preventDefault());
		button.addEventListener("click", () => { void selectMapSuggestion(index); });
		option.append(button);
		return option;
	}));
	mapPickerSuggestions.hidden = false;
	mapPickerInput.setAttribute("aria-expanded", "true");
}

async function selectGooglePlace(placeId) {
	try {
		googleAutocompleteSessionToken = null;
		const { Place } = await window.google.maps.importLibrary("places");
		const place = new Place({ id: placeId });
		await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
		if (!place.location) {
			mapPickerFeedback.textContent = "Google Maps no devolvió las coordenadas de ese lugar.";
			return;
		}
		await setMapPickerSelection({
			lat: place.location.lat(),
			lng: place.location.lng()
		}, false, place.formattedAddress || place.displayName);
	} catch (error) {
		mapPickerFeedback.textContent = `No se pudo abrir ese lugar de Google Maps: ${error.message}`;
	}
}

async function selectMapSuggestion(index) {
	const place = mapSuggestionItems[index];
	if (!place) {
		return;
	}
	const prediction = place.googlePlace ? googlePlacePredictions[index] : null;
	hideMapSuggestions();
	if (place.googlePlace) {
		if (prediction) {
			try {
				const googlePlace = prediction.toPlace();
				await googlePlace.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
				googleAutocompleteSessionToken = null;
				if (!googlePlace.location) {
					mapPickerFeedback.textContent = "Google Maps no devolvió las coordenadas de ese lugar.";
					return;
				}
				await setMapPickerSelection({
					lat: googlePlace.location.lat(),
					lng: googlePlace.location.lng()
				}, false, googlePlace.formattedAddress || googlePlace.displayName);
			} catch (error) {
				mapPickerFeedback.textContent = `No se pudo cargar el lugar: ${error.message}`;
			}
		}
		return;
	}
	void setMapPickerSelection({ lat: place.latitude, lng: place.longitude });
	mapPickerInput.value = place.label;
	mapPickerFeedback.textContent = "Lugar encontrado. Ajusta el pin si hace falta y confirma la ubicación.";
	void updateMapPicker();
}

async function setMapPickerSelection(point, reverseGeocode = false, displayName = "") {
	mapPickerCoordinates = { latitude: point.lat, longitude: point.lng };
	if (mapPickerProvider === "google") {
		const position = { lat: point.lat, lng: point.lng };
		mapPickerMap.setCenter(position);
		mapPickerMap.setZoom(Math.max(mapPickerMap.getZoom(), 15));
		mapPickerMarker.setPosition(position);
		mapPickerMarker.setMap(mapPickerMap);
	} else {
		mapPickerMap.setView([point.lat, point.lng], Math.max(mapPickerMap.getZoom(), 15));
		if (mapPickerMarker) {
			mapPickerMarker.setLatLng([point.lat, point.lng]);
		} else {
			mapPickerMarker = L.marker([point.lat, point.lng], { draggable: true }).addTo(mapPickerMap);
			mapPickerMarker.on("dragend", () => setMapPickerSelection(mapPickerMarker.getLatLng(), true));
		}
	}
	mapPickerInput.value = displayName || `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
	mapPickerFeedback.textContent = "Punto marcado. Puedes arrastrar el pin para afinarlo.";
	void updateMapPicker();
	if (!reverseGeocode || mapPickerProvider === "google") {
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
			void updateMapPicker();
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

function completePurchase(paymentMethod) {
	const unavailable = cart.some((item) => {
		const product = products.find((entry) => entry.id === item.productId);
		return !product || item.quantity > product.stock;
	});
	if (unavailable) {
		checkoutFeedback.textContent = "El stock cambió. Revisa el carrito e inténtalo de nuevo.";
		return;
	}

	checkoutFeedback.textContent = "";
	const confirmButton = document.querySelector("#confirm-payment");
	const total = getOrderTotal();
	const deliveryLocation = deliveryToggle.checked ? getDeliveryLocation() : "";
	const order = {
		id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
		createdAt: new Date().toISOString(),
		status: "pending",
		paymentMethod,
		total,
		delivery: deliveryLocation ? { location: deliveryLocation, fee: deliveryFee } : null,
		items: cart.map((item) => {
			const product = products.find((entry) => entry.id === item.productId);
			return {
				productId: product.id,
				name: product.name,
				saleMode: product.saleMode,
				quantity: item.quantity,
				price: getDiscountedPrice(product.price),
				lineTotal: getCartLineTotal(product, item.quantity)
			};
		})
	};
	orders.unshift(order);
	if (!saveOrders()) {
		orders.shift();
		checkoutFeedback.textContent = "No se pudo guardar el pedido en este navegador. La compra sigue en el carrito; inténtalo de nuevo.";
		return;
	}

	purchaseMessage.textContent = `${getOrderDisplayId(order)} · Por aceptar · ${paymentMethod}`;
	purchaseTotal.textContent = formatMoney(total);
	document.querySelector("#purchase-total-bs").textContent = formatBolivars(total);
	document.querySelector("#purchase-delivery").textContent = deliveryLocation
		? `Pedido enviado a ventas · ${deliveryLocation} · ${formatMoney(deliveryFee)} (${formatBolivars(deliveryFee)})`
		: "Retiro en tienda";

	cart = [];
	deliveryToggle.checked = false;
	deliveryAddress.value = "";
	deliveryMapLink.value = "";
	deliveryCoordinates = null;
	deliveryFee = 0;
	deliveryEstimate.hidden = true;
	deliveryFields.hidden = true;
	if (paymentDetailsDialog.open) {
		paymentDetailsDialog.close();
	}
	checkoutDialog.close();
	confirmButton.disabled = false;
	showFeedback("Pedido enviado a la tienda. Está pendiente de aceptación.");
	renderCart();
	renderProducts();
	renderSales();
}

productForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const name = productNameInput.value.trim();
	const price = Number(productPriceInput.value);
	const stockAmount = Number(productStockInput.value);
	const saleMode = productSaleModeInput.value;
	const stock = getStoredStock(stockAmount, saleMode);
	const invalidWeightPrecision = saleMode === "weight" &&
		Math.abs(stockAmount * GRAMS_PER_KILOGRAM - stock) > 1e-6;

	if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stockAmount) ||
		stockAmount < 0 || (saleMode === "unit" && !Number.isInteger(stockAmount)) ||
		invalidWeightPrecision || (stockAmount > 0 && stock === 0)) {
		showFeedback(saleMode === "weight"
			? "Revisa el nombre, el precio por kg y las existencias (kg, hasta tres decimales)."
			: "Revisa el nombre, el precio y la cantidad entera ingresados.", true);
		return;
	}

	const editedProduct = editingProductId
		? products.find((product) => product.id === editingProductId)
		: null;
	let cartItemRemoved = false;
	let cartRemovedForSaleModeChange = false;
	if (editingProductId && !editedProduct) {
		showFeedback("No se encontró el producto que intentas editar. Actualiza la página e inténtalo de nuevo.", true);
		return;
	}
	if (editedProduct) {
		const saleModeChanged = editedProduct.saleMode !== saleMode;
		editedProduct.name = name;
		editedProduct.price = price;
		editedProduct.category = productCategoryInput.value;
		editedProduct.saleMode = saleMode;
		editedProduct.stock = stock;
		if (saleModeChanged || getCartQuantity(editedProduct.id) > stock) {
			cart = cart.filter((item) => item.productId !== editedProduct.id);
			cartItemRemoved = true;
			cartRemovedForSaleModeChange = saleModeChanged;
		}
	} else {
		products.push({
			id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
			name,
			price,
			category: productCategoryInput.value,
			saleMode,
			stock
		});
	}
	lastSuggestedProductCategory = null;
	saveProducts();
	productForm.reset();
	productCategoryHint.textContent = "";
	configureProductFormMode();
	editingProductId = null;
	document.querySelector("#submit-product-button").textContent = "＋ Agregar al inventario";
	document.querySelector("#cancel-edit-button").hidden = true;
	showFeedback(editedProduct
		? cartItemRemoved
			? cartRemovedForSaleModeChange
				? "Cambios guardados. El producto se retiró del carrito porque cambió su forma de venta."
				: "Cambios guardados. El producto se retiró del carrito porque el stock ya no cubría la cantidad."
			: "Cambios guardados en el producto."
		: "Producto agregado al inventario.");

	if (stock === 0) {
		stockAlert.textContent = `¡Atención! ${name} ${editedProduct ? "quedó" : "se registró"} sin existencias.`;
		stockAlert.hidden = false;
		document.querySelector("#admin-stock-alert").textContent = `“${name}” ${editedProduct ? "está" : "fue agregado"} sin existencias.`;
		document.querySelector("#admin-stock-alert").hidden = false;
	} else {
		stockAlert.hidden = true;
	}
	renderProducts();
	renderCart();
});

document.querySelector("#cancel-edit-button").addEventListener("click", cancelProductEdit);
productNameInput.addEventListener("input", updateProductCategorySuggestion);
productCategoryInput.addEventListener("change", () => {
	const nextMode = ["Carnes", "Charcutería"].includes(productCategoryInput.value) ? "weight" : "unit";
	if (!isSuggestingProductCategory) {
		lastSuggestedProductCategory = null;
		productCategoryHint.textContent = "Categoría seleccionada manualmente.";
	}
	if (nextMode !== productSaleModeInput.value) {
		productStockInput.value = "";
		productSaleModeInput.value = nextMode;
		configureProductFormMode();
		if (editingProductId) {
			showFeedback(`La categoría requiere venta ${nextMode === "weight" ? "por peso" : "por unidad"}. Ingresa las existencias actuales en ${nextMode === "weight" ? "kg" : "unidades"}.`);
		}
	}
});
productSaleModeInput.addEventListener("change", () => {
	if (editingProductId) {
		const product = products.find((entry) => entry.id === editingProductId);
		if (product && product.saleMode !== productSaleModeInput.value) {
			productStockInput.value = "";
			showFeedback(`Cambiaste la forma de venta. Ingresa las existencias actuales en ${productSaleModeInput.value === "weight" ? "kg" : "unidades"}.`);
		}
	}
	configureProductFormMode();
});
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
salesStatusFilter.addEventListener("change", renderSales);
salesOrdersList.addEventListener("click", (event) => {
	const button = event.target.closest("[data-order-action]");
	if (!button) {
		return;
	}
	const nextStatus = {
		accept: "accepted",
		reject: "rejected",
		complete: "completed"
	}[button.dataset.orderAction];
	if (nextStatus) {
		updateOrderStatus(button.dataset.orderId, nextStatus);
	}
});
salesOrdersList.addEventListener("change", (event) => {
	if (!event.target.matches(".sales-review-rating input")) {
		return;
	}
	const form = event.target.closest("[data-order-review]");
	const reasonLabel = form.querySelector(".sales-review-reason");
	const reasonInput = reasonLabel.querySelector("textarea");
	const isNegative = Number(event.target.value) <= 2;
	form.querySelectorAll(".sales-review-star").forEach((star, index) => {
		star.classList.toggle("selected", index < Number(event.target.value));
	});
	reasonLabel.hidden = !isNegative;
	reasonInput.required = isNegative;
});
salesOrdersList.addEventListener("submit", (event) => {
	const form = event.target.closest("[data-order-review]");
	if (!form) {
		return;
	}
	event.preventDefault();
	if (!form.reportValidity()) {
		return;
	}
	const order = orders.find((entry) => entry.id === form.dataset.orderId);
	if (!order || order.status !== "completed") {
		salesFeedback.textContent = "Solo puedes reseñar un pedido completado.";
		return;
	}
	const rating = Number(form.querySelector('input[name^="rating-"]:checked')?.value);
	const reason = form.elements.reason.value.trim();
	if (!Number.isInteger(rating) || rating < 1 || rating > 5 || (rating <= 2 && !reason)) {
		salesFeedback.textContent = "Selecciona de 1 a 5 estrellas y explica las calificaciones de 1 o 2 estrellas.";
		return;
	}
	const previousReview = order.review;
	order.review = {
		receivedAt: form.elements.receivedAt.value,
		rating,
		reason: rating <= 2 ? reason : ""
	};
	if (!saveOrders()) {
		if (previousReview) {
			order.review = previousReview;
		} else {
			delete order.review;
		}
		salesFeedback.textContent = "No se pudo guardar la reseña en este navegador. Inténtalo de nuevo.";
		return;
	}
	salesFeedback.textContent = `Reseña de ${getOrderDisplayId(order)} guardada. Gracias por compartir tu experiencia.`;
	renderSales();
});
window.addEventListener("storage", (event) => {
	if (event.key === ORDER_STORAGE_KEY) {
		orders = loadOrders();
		renderSales();
	} else if (event.key === STORAGE_KEY) {
		products = loadProducts();
		renderProducts();
		renderCart();
	}
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
	const validLink = getValidatedMapLink();
	deliveryCoordinates = validLink ? getCoordinatesFromMapLink(validLink) : null;
	if (deliveryCoordinates) {
		updateDeliveryEstimate();
		mapFeedback.textContent = "Ubicación reconocida y costo calculado. Puedes verificar el pin en el mapa.";
	} else {
		updateDeliveryEstimate();
		mapFeedback.textContent = deliveryMapLink.value.trim() && !validLink
			? "Pega un enlace https de Google Maps, como maps.app.goo.gl o el dominio regional de Google."
			: validLink
				? "Enlace aceptado. Abre «Elegir en el mapa» y marca el punto para calcular el delivery; los enlaces cortos no incluyen coordenadas."
				: "Escribe una dirección, usa GPS o pega un enlace de Google Maps.";
	}
	updateDeliveryMap();
});
useCurrentLocationButton.addEventListener("click", useCurrentLocation);
openMapPickerButton.addEventListener("click", openMapPicker);
mapPickerInput.addEventListener("input", () => {
	mapSuggestionRequestId++;
	mapPickerCoordinates = null;
	hideMapSuggestions();
	mapPickerFeedback.textContent = mapPickerInput.value.trim().length >= 3
		? "Buscando sugerencias..."
		: "Escribe al menos 3 caracteres para ver sugerencias.";
	document.querySelector("#map-picker-selection-summary").textContent = "Busca y marca un punto en el mapa";
	document.querySelector("#map-picker-coordinates").textContent = "";
	if (mapPickerMarker && mapPickerMap) {
		if (mapPickerProvider === "google") {
			mapPickerMarker.setMap(null);
		} else {
			mapPickerMap.removeLayer(mapPickerMarker);
			mapPickerMarker = null;
		}
	}
	window.clearTimeout(mapPickerSearchTimer);
	if (mapPickerInput.value.trim().length >= 3) {
		mapPickerSearchTimer = window.setTimeout(searchMapLocation, 450);
	}
});
document.querySelector("#search-map-location").addEventListener("click", searchMapLocation);
mapPickerInput.addEventListener("keydown", (event) => {
	if (event.key === "ArrowDown" || event.key === "ArrowUp") {
		if (mapSuggestionItems.length === 0) {
			return;
		}
		event.preventDefault();
		const direction = event.key === "ArrowDown" ? 1 : -1;
		activeMapSuggestionIndex = activeMapSuggestionIndex < 0
			? direction === 1 ? 0 : mapSuggestionItems.length - 1
			: (activeMapSuggestionIndex + direction + mapSuggestionItems.length) % mapSuggestionItems.length;
		for (const [index, option] of [...mapPickerSuggestions.children].entries()) {
			const isSelected = index === activeMapSuggestionIndex;
			option.setAttribute("aria-selected", String(isSelected));
			if (isSelected) {
				mapPickerInput.setAttribute("aria-activedescendant", option.id);
			}
		}
	} else if (event.key === "Enter") {
		event.preventDefault();
		window.clearTimeout(mapPickerSearchTimer);
		if (activeMapSuggestionIndex >= 0) {
			selectMapSuggestion(activeMapSuggestionIndex);
		} else {
			searchMapLocation();
		}
	} else if (event.key === "Escape") {
		hideMapSuggestions();
	}
});
mapPickerCurrentLocationButton.addEventListener("click", useLocationInPicker);
document.querySelector("#confirm-map-location").addEventListener("click", selectMapPickerLocation);
document.querySelector("#close-map-picker").addEventListener("click", () => mapPickerDialog.close());
document.querySelector("#cancel-map-picker").addEventListener("click", () => mapPickerDialog.close());
checkoutButton.addEventListener("click", openCheckout);
document.querySelector("#cancel-delete-product").addEventListener("click", () => deleteConfirmDialog.close());
document.querySelector("#confirm-delete-product").addEventListener("click", confirmProductDeletion);
deleteConfirmDialog.addEventListener("close", () => {
	pendingDeleteProductId = null;
});
deleteConfirmDialog.addEventListener("click", (event) => {
	if (event.target === deleteConfirmDialog) {
		deleteConfirmDialog.close();
	}
});
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
document.querySelector("#sales-date").textContent = new Intl.DateTimeFormat("es", {
	day: "numeric",
	month: "long",
	year: "numeric"
}).format(new Date()).toLocaleUpperCase("es");
renderProducts();
renderCart();
renderSales();
configureProductFormMode();
window.setInterval(() => {
	if (document.visibilityState === "visible") {
		loadDailyRate();
	}
}, RATE_REFRESH_INTERVAL_MS);
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible") {
		loadDailyRate();
	}
});
loadDailyRate();
