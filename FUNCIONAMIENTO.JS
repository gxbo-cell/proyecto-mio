"use strict";

const RATE_STORAGE_KEY = "la-tiendita-bcv-rate-v2";
const CART_STORAGE_KEY = "la-tiendita-cart-v1";
const RATE_ENDPOINT = "https://ve.dolarapi.com/v1/dolares/oficial";
const RATE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DELIVERY_ORIGIN = { latitude: 10.4806, longitude: -66.9036 };
const DELIVERY_ZONE_KM = 5;
const DELIVERY_ZONE_PRICE = 1;
const DISCOUNT_THRESHOLD = 50;
const DISCOUNT_RATE = 0.1;
const GRAMS_PER_KILOGRAM = 1000;
const GRAMS_PER_POUND = 453.59237;
const NEARBY_PLACE_RADIUS_KM = 2.5;
const NEARBY_PLACES_CACHE_MS = 10 * 60 * 1000;
const NEARBY_PLACES_MIN_INTERVAL_MS = 4000;
const WEIGHT_UNITS = {
	g: { grams: 1, step: "1", minimum: "1" },
	kg: { grams: GRAMS_PER_KILOGRAM, step: "0.001", minimum: "0.001" },
	lb: { grams: GRAMS_PER_POUND, step: "0.01", minimum: "0.01" }
};
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
const productBrandInput = document.querySelector("#product-brand");
const productImageUrlInput = document.querySelector("#product-image-url");
const productImagePreview = document.querySelector("#product-image-preview");
const productImagePreviewImage = document.querySelector("#product-image-preview-img");
const productImagePreviewMessage = document.querySelector("#product-image-preview-message");
const searchProductImageButton = document.querySelector("#search-product-image");
const productCategoryInput = document.querySelector("#product-category");
const productCategoryHint = document.querySelector("#product-category-hint");
const productSaleModeInput = document.querySelector("#product-sale-mode");
const productPriceInput = document.querySelector("#product-price");
const productStockInput = document.querySelector("#product-stock");
const productPriceLabel = document.querySelector("#product-price-label");
const productStockLabel = document.querySelector("#product-stock-label");
const productStockGuidance = document.querySelector("#product-stock-guidance");
const productList = document.querySelector("#product-list");
const paymentSettingsForm = document.querySelector("#payment-settings-form");
const paymentSettingsFeedback = document.querySelector("#payment-settings-feedback");
const paymentSettingsSaveButton = document.querySelector("#save-payment-settings");
const catalogProducts = document.querySelector("#catalog-products");
const catalogLoading = document.querySelector("#catalog-loading");
const catalogLoadingMessage = document.querySelector("#catalog-loading-message");
const catalogRetryButton = document.querySelector("#catalog-retry-button");
const categoryFilters = document.querySelector("#category-filters");
const catalogToolbar = document.querySelector("#catalog-toolbar");
const emptyState = document.querySelector("#empty-state");
const noResults = document.querySelector("#no-results");
const searchInput = document.querySelector("#search-input");
const catalogSort = document.querySelector("#catalog-sort");
const availabilityFilter = document.querySelector("#availability-filter");
const catalogResultsCount = document.querySelector("#catalog-results-count");
const clearCatalogFiltersButton = document.querySelector("#clear-catalog-filters");
const inventorySearchInput = document.querySelector("#inventory-search-input");
const stockFilter = document.querySelector("#stock-filter");
const formFeedback = document.querySelector("#form-feedback");
const stockAlert = document.querySelector("#stock-alert");
const catalogFeedback = document.querySelector("#catalog-feedback");
const purchaseMessage = document.querySelector("#purchase-message");
const purchaseTotal = document.querySelector("#purchase-total");
const purchaseReviewDialog = document.querySelector("#purchase-review-dialog");
const purchaseReviewsList = document.querySelector("#purchase-reviews-list");
const purchaseReviewsFeedback = document.querySelector("#purchase-reviews-feedback");
const shoppingReviewAverage = document.querySelector("#shopping-review-average");
const shoppingReviewCount = document.querySelector("#shopping-review-count");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartCount = document.querySelector("#cart-count");
const cartTotal = document.querySelector("#cart-total");
const mobileCartSummary = document.querySelector("#mobile-cart-summary");
const mobileCartCount = document.querySelector("#mobile-cart-count");
const mobileCartTotal = document.querySelector("#mobile-cart-total");
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
const mapPickerMapStatus = document.querySelector("#map-picker-map-status");
const mapPickerMapStatusMessage = document.querySelector("#map-picker-map-status-message");
const retryMapLoadButton = document.querySelector("#retry-map-load");
const mapPickerFeedback = document.querySelector("#map-picker-feedback");
const mapBusinessFeedback = document.querySelector("#map-business-feedback");
const nearbyPlacesList = document.querySelector("#nearby-places-list");
const refreshNearbyPlacesButton = document.querySelector("#refresh-nearby-places");
const mapPickerCurrentLocationButton = document.querySelector("#map-picker-current-location");
const salesOrdersList = document.querySelector("#sales-orders-list");
const salesEmptyState = document.querySelector("#sales-empty-state");
const salesFilterEmpty = document.querySelector("#sales-filter-empty");
const salesFeedback = document.querySelector("#sales-feedback");
const salesStatusFilter = document.querySelector("#sales-status-filter");
const salesSearchInput = document.querySelector("#sales-search-input");
const pendingOrderCount = document.querySelector("#pending-order-count");
const accountDialog = document.querySelector("#account-dialog");
const accountForm = document.querySelector("#account-form");
const accountFeedback = document.querySelector("#account-feedback");
const accountButton = document.querySelector("#account-button");
const signOutButton = document.querySelector("#sign-out-button");
const myOrdersButton = document.querySelector("#my-orders-button");

let products = [];
let hasLoadedProducts = false;
let catalogLoadTimeoutId = 0;
let catalogLoadError = false;
let orders = [];
let supabaseClient = null;
let currentUser = null;
let isStoreAdmin = false;
let isCreatingAccount = false;
let paymentSettings = {
	cash_instructions: "Paga al retirar en tienda o al recibir tu pedido.",
	mobile_phone: "",
	mobile_document: "",
	mobile_bank: "",
	transfer_bank: "",
	transfer_account_number: "",
	transfer_account_holder: "",
	transfer_document: ""
};
let activeReviewOrderId = null;
let cart = loadCachedCart();
let exchangeRate = loadCachedRate();
let isLoadingExchangeRate = false;
let deliveryCoordinates = null;
let mapPickerCoordinates = null;
let mapPickerSearchTimer = 0;
let nearbyPlacesSearchTimer = 0;
let mapSuggestionRequestId = 0;
let mapReverseGeocodeRequestId = 0;
let nearbyPlacesRequestId = 0;
let nearbyPlacesLastRequestAt = 0;
let mapSuggestionItems = [];
let activeMapSuggestionIndex = -1;
let mapPickerMap;
let mapPickerMarker;
let mapNearbyLayer;
let mapNearbyMarkers = [];
let mapPickerProvider = null;
let leafletLibraryPromise;
let mapboxLibraryPromise;
let googleMapsApiPromise;
let localMapsConfigPromise;
let localMapboxConfigPromise;
let googlePlacePredictions = [];
let googleAutocompleteSessionToken = null;
const nearbyPlacesCache = new Map();
let deliveryFee = 0;
let activeCategory = "Todos";
let showAvailableOnly = false;
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

function getSafeProductImageUrl(value) {
	if (!value.trim()) {
		return "";
	}
	try {
		const url = new URL(value.trim());
		return url.protocol === "https:" ? url.href : "";
	} catch {
		return "";
	}
}

function updateProductImagePreview() {
	const enteredUrl = productImageUrlInput.value.trim();
	const imageUrl = getSafeProductImageUrl(enteredUrl);
	updateProductImageAlt();
	productImagePreview.hidden = !enteredUrl;
	productImagePreviewImage.hidden = true;
	productImagePreviewImage.removeAttribute("src");
	if (!enteredUrl) {
		return;
	}
	if (!imageUrl) {
		productImagePreviewMessage.textContent = "Pega un enlace HTTPS válido para mostrar la foto con seguridad.";
		return;
	}
	productImagePreviewMessage.textContent = "Cargando vista previa…";
	productImagePreviewImage.onload = () => {
		productImagePreviewImage.hidden = false;
		productImagePreviewMessage.textContent = "Vista previa del producto";
	};
	productImagePreviewImage.onerror = () => {
		productImagePreviewImage.hidden = true;
		productImagePreviewMessage.textContent = "No se pudo mostrar esta imagen. Prueba con otro enlace directo.";
	};
	productImagePreviewImage.src = imageUrl;
}

function updateProductImageAlt() {
	productImagePreviewImage.alt = [productBrandInput.value.trim(), productNameInput.value.trim()]
		.filter(Boolean)
		.join(" ") || "Vista previa del producto";
}

function loadCachedCart() {
	try {
		const cachedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
		if (!Array.isArray(cachedCart)) {
			return [];
		}
		const quantities = new Map();
		for (const item of cachedCart) {
			if (typeof item?.productId === "string" && Number.isInteger(item.quantity) && item.quantity > 0) {
				quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
			}
		}
		return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
	} catch {
		return [];
	}
}

function saveCart() {
	try {
		localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
	} catch {
		catalogFeedback.textContent = "No se pudo guardar el carrito en este dispositivo.";
		catalogFeedback.classList.add("error");
	}
}

function reconcileCartWithProducts() {
	const availableProducts = new Map(products.map((product) => [product.id, product]));
	const updatedCart = cart.reduce((items, item) => {
		const product = availableProducts.get(item.productId);
		if (!product || product.stock < 1) {
			return items;
		}
		items.push({ ...item, quantity: Math.min(item.quantity, product.stock) });
		return items;
	}, []);
	const changed = updatedCart.length !== cart.length ||
		updatedCart.some((item, index) => item.quantity !== cart[index]?.quantity);
	cart = updatedCart;
	if (changed) {
		saveCart();
	}
}

function loadLocalGoogleMapsConfig() {
	if (window.GOOGLE_MAPS_API_KEY || !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
		return Promise.resolve(Boolean(window.GOOGLE_MAPS_API_KEY));
	}
	if (!localMapsConfigPromise) {
		localMapsConfigPromise = new Promise((resolve) => {
			const script = document.createElement("script");
			script.src = "MAPS_CONFIG.LOCAL.JS";
			script.addEventListener("load", () => resolve(Boolean(window.GOOGLE_MAPS_API_KEY)), { once: true });
			script.addEventListener("error", () => resolve(false), { once: true });
			document.head.append(script);
		});
	}
	return localMapsConfigPromise;
}

function loadLocalMapboxConfig() {
	if (window.MAPBOX_PUBLIC_TOKEN || !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
		return Promise.resolve(Boolean(window.MAPBOX_PUBLIC_TOKEN));
	}
	if (!localMapboxConfigPromise) {
		localMapboxConfigPromise = new Promise((resolve) => {
			const script = document.createElement("script");
			script.src = "MAPBOX_CONFIG.LOCAL.JS";
			script.addEventListener("load", () => resolve(Boolean(window.MAPBOX_PUBLIC_TOKEN)), { once: true });
			script.addEventListener("error", () => resolve(false), { once: true });
			document.head.append(script);
		});
	}
	return localMapboxConfigPromise;
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

function mapProduct(row) {
	return {
		id: row.id,
		name: row.name,
		brand: row.brand || "",
		imageUrl: row.image_url || "",
		price: Number(row.price),
		category: row.category,
		saleMode: row.sale_mode,
		stock: row.stock
	};
}

function mapOrder(row) {
	return {
		id: row.id,
		userId: row.user_id,
		createdAt: row.created_at,
		status: row.status,
		paymentMethod: row.payment_method,
		total: Number(row.total),
		delivery: row.delivery,
		items: row.items,
		receivedConfirmed: row.received_confirmed,
		review: row.review_rating == null ? null : {
			rating: row.review_rating,
			reason: row.review_reason || ""
		}
	};
}

function mapReturnedOrder(data) {
	const row = Array.isArray(data) ? data[0] : data;
	if (!row) {
		throw new Error("La tienda no devolvió los datos del pedido.");
	}
	return mapOrder(row);
}

async function loadProducts() {
	const { data, error } = await supabaseClient.from("products").select("*").order("name");
	if (error) {
		throw error;
	}
	products = data.map(mapProduct);
	hasLoadedProducts = true;
	reconcileCartWithProducts();
}

async function loadOrders() {
	if (!currentUser) {
		orders = [];
		return;
	}
	const { data, error } = await supabaseClient.from("orders").select("*").order("created_at", { ascending: false });
	if (error) {
		throw error;
	}
	orders = data.map(mapOrder);
}

function isMobilePaymentConfigured(settings = paymentSettings) {
	return Boolean(settings.mobile_phone?.trim() && settings.mobile_document?.trim() && settings.mobile_bank?.trim());
}

function isTransferPaymentConfigured(settings = paymentSettings) {
	return Boolean(settings.transfer_bank?.trim() && settings.transfer_account_number?.trim() && settings.transfer_account_holder?.trim());
}

function renderPaymentSettingsForm() {
	const fields = {
		mobilePhone: paymentSettings.mobile_phone,
		mobileDocument: paymentSettings.mobile_document,
		mobileBank: paymentSettings.mobile_bank,
		transferBank: paymentSettings.transfer_bank,
		transferAccount: paymentSettings.transfer_account_number,
		transferHolder: paymentSettings.transfer_account_holder,
		transferDocument: paymentSettings.transfer_document,
		cashInstructions: paymentSettings.cash_instructions
	};
	for (const [name, value] of Object.entries(fields)) {
		paymentSettingsForm.elements[name].value = value || "";
	}
}

function updatePaymentMethodAvailability() {
	const mobileReady = isMobilePaymentConfigured();
	const transferReady = isTransferPaymentConfigured();
	const mobileInput = document.querySelector('#mobile-payment-option input[name="payment-method"]');
	const transferInput = document.querySelector('#transfer-payment-option input[name="payment-method"]');
	mobileInput.disabled = !mobileReady;
	transferInput.disabled = !transferReady;
	document.querySelector("#mobile-payment-availability").textContent = mobileReady
		? "Datos de pago disponibles."
		: "No disponible todavía; faltan datos del comercio.";
	document.querySelector("#transfer-payment-availability").textContent = transferReady
		? "Datos de pago disponibles."
		: "No disponible todavía; faltan datos del comercio.";
	document.querySelector("#mobile-payment-option").classList.toggle("payment-option-unavailable", !mobileReady);
	document.querySelector("#transfer-payment-option").classList.toggle("payment-option-unavailable", !transferReady);
	if (mobileInput.disabled) {
		mobileInput.checked = false;
	}
	if (transferInput.disabled) {
		transferInput.checked = false;
	}
}

async function refreshPaymentSettings() {
	try {
		const { data, error } = await supabaseClient
			.from("store_payment_settings")
			.select("*")
			.eq("id", true)
			.maybeSingle();
		if (error) {
			throw error;
		}
		if (!data) {
			throw new Error("No se encontró la configuración de pagos.");
		}
		paymentSettings = {
			...paymentSettings,
			...Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]))
		};
		renderPaymentSettingsForm();
		paymentSettingsFeedback.textContent = "Datos de pago cargados.";
		paymentSettingsFeedback.classList.remove("error");
	} catch (error) {
		paymentSettingsFeedback.textContent = `No se pudo cargar la configuración de pagos: ${getBackendError(error)}. Verifica que ejecutaste la versión actualizada de SUPABASE_SCHEMA.SQL.`;
		paymentSettingsFeedback.classList.add("error");
	}
	updatePaymentMethodAvailability();
}

async function savePaymentSettings(event) {
	event.preventDefault();
	const settings = {
		id: true,
		mobile_phone: paymentSettingsForm.elements.mobilePhone.value.trim(),
		mobile_document: paymentSettingsForm.elements.mobileDocument.value.trim(),
		mobile_bank: paymentSettingsForm.elements.mobileBank.value.trim(),
		transfer_bank: paymentSettingsForm.elements.transferBank.value.trim(),
		transfer_account_number: paymentSettingsForm.elements.transferAccount.value.trim(),
		transfer_account_holder: paymentSettingsForm.elements.transferHolder.value.trim(),
		transfer_document: paymentSettingsForm.elements.transferDocument.value.trim(),
		cash_instructions: paymentSettingsForm.elements.cashInstructions.value.trim() || "Paga al retirar en tienda o al recibir tu pedido.",
		updated_at: new Date().toISOString()
	};
	paymentSettingsFeedback.textContent = "";
	paymentSettingsFeedback.classList.remove("error");
	paymentSettingsSaveButton.disabled = true;
	paymentSettingsSaveButton.textContent = "Guardando...";
	try {
		const { error } = await supabaseClient.from("store_payment_settings").upsert(settings, { onConflict: "id" });
		if (error) {
			throw error;
		}
		paymentSettings = settings;
		updatePaymentMethodAvailability();
		paymentSettingsFeedback.textContent = "Datos de pago guardados. Los métodos completos ya están disponibles para los compradores.";
	} catch (error) {
		paymentSettingsFeedback.textContent = `No se pudieron guardar los datos de pago: ${getBackendError(error)}`;
		paymentSettingsFeedback.classList.add("error");
	} finally {
		paymentSettingsSaveButton.disabled = false;
		paymentSettingsSaveButton.textContent = "Guardar datos de pago";
	}
}

async function saveProduct(product) {
	const { error } = await supabaseClient.from("products").upsert({
		id: product.id,
		name: product.name,
		brand: product.brand,
		image_url: product.imageUrl,
		price: product.price,
		category: product.category,
		sale_mode: product.saleMode,
		stock: product.stock
	});
	if (error) {
		throw error;
	}
}

function debounce(callback, delayMs = 150) {
	let timerId;
	return function (...args) {
		window.clearTimeout(timerId);
		timerId = window.setTimeout(() => callback.apply(this, args), delayMs);
	};
}

function getBackendError(error) {
	if (!error) {
		return "Ocurrió un error al comunicarse con la tienda.";
	}
	if (typeof error === "string") {
		return error;
	}
	const main = error.message || error.error_description || "Ocurrió un error al comunicarse con la tienda.";
	if (error.details && typeof error.details === "string" && error.details !== main) {
		return `${main} (${error.details})`;
	}
	return main;
}

async function refreshStoreData() {
	if (!hasLoadedProducts && !catalogLoadError) {
		catalogLoading.hidden = false;
		if (!catalogLoadTimeoutId) {
			catalogLoading.classList.remove("catalog-loading-error");
			catalogLoadingMessage.textContent = "Cargando productos frescos…";
			catalogRetryButton.hidden = true;
			catalogLoadTimeoutId = window.setTimeout(() => {
				catalogLoadTimeoutId = 0;
				if (!hasLoadedProducts) {
					catalogLoadError = true;
					catalogLoading.classList.add("catalog-loading-error");
					catalogLoadingMessage.textContent = "La tienda está tardando en responder. Revisa tu conexión.";
					catalogRetryButton.hidden = false;
				}
			}, 8000);
		}
	}
	try {
		await Promise.all([loadProducts(), loadOrders()]);
		window.clearTimeout(catalogLoadTimeoutId);
		catalogLoadTimeoutId = 0;
		catalogLoadError = false;
		renderProducts();
		renderCart();
		renderSales();
		catalogFeedback.textContent = "";
		if (activeReviewOrderId && purchaseReviewDialog.open) {
			renderPurchaseReviews(activeReviewOrderId);
		}
	} catch (error) {
		window.clearTimeout(catalogLoadTimeoutId);
		catalogLoadTimeoutId = 0;
		if (!hasLoadedProducts) {
			catalogLoadError = true;
			catalogLoading.hidden = false;
			catalogLoading.classList.add("catalog-loading-error");
			catalogLoadingMessage.textContent = "No se pudo cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.";
			catalogRetryButton.hidden = false;
		}
		catalogFeedback.textContent = `No se pudieron cargar los datos compartidos: ${getBackendError(error)}`;
		renderProducts();
	}
	await refreshReviewSummary();
}

function loadCachedRate() {
	try {
		const cachedRate = JSON.parse(localStorage.getItem(RATE_STORAGE_KEY) || "null");
		if (cachedRate && Number.isFinite(cachedRate.value) && cachedRate.value > 0) {
			return cachedRate;
		}
	} catch {
		// El navegador puede bloquear el almacenamiento local.
	}
	return null;
}

async function loadDailyRate() {
	if (isLoadingExchangeRate) {
		return;
	}
	isLoadingExchangeRate = true;
	if (exchangeRate) {
		renderExchangeRate("Tasa guardada · ");
	}

	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => controller.abort(), 6000);
	try {
		const response = await fetch(RATE_ENDPOINT, {
			cache: "no-store",
			signal: controller.signal
		});
		if (!response.ok) {
			throw new Error(`El servicio respondió con estado ${response.status}.`);
		}
		const data = await response.json();
		if (!Number.isFinite(data.promedio) || data.promedio <= 0) {
			throw new Error("El servicio devolvió una tasa no válida.");
		}
		exchangeRate = {
			value: data.promedio,
			date: data.fechaActualizacion || new Date().toISOString()
		};
		try {
			localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(exchangeRate));
		} catch {
			// La tasa actualizada sigue disponible aunque el navegador bloquee el almacenamiento.
		}
		renderExchangeRate("Tasa oficial BCV · ");
		renderProducts();
		renderCart();
	} catch {
		if (exchangeRate) {
			renderExchangeRate("Tasa guardada · ");
		} else {
			const dailyRate = document.querySelector("#daily-rate-value");
			const shoppingRate = document.querySelector("#shopping-rate-value");
			const updatedLabel = document.querySelector("#rate-updated");
			const shoppingUpdatedLabel = document.querySelector("#shopping-rate-updated");
			if (dailyRate) dailyRate.textContent = "No disponible";
			if (shoppingRate) shoppingRate.textContent = "No disponible";
			if (updatedLabel) updatedLabel.textContent = "Tasa oficial no disponible";
			if (shoppingUpdatedLabel) shoppingUpdatedLabel.textContent = "Tasa oficial no disponible";
		}
	} finally {
		window.clearTimeout(timeoutId);
		isLoadingExchangeRate = false;
	}
}

function renderExchangeRate(prefix = "Fecha valor · ") {
	if (!exchangeRate || !Number.isFinite(exchangeRate.value)) {
		return;
	}
	const formattedRate = new Intl.NumberFormat("es-VE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4
	}).format(exchangeRate.value);
	const dailyRate = document.querySelector("#daily-rate-value");
	const shoppingRate = document.querySelector("#shopping-rate-value");
	if (dailyRate) dailyRate.textContent = "Bs " + formattedRate;
	if (shoppingRate) shoppingRate.textContent = "Bs " + formattedRate;

	let formattedDate = "";
	try {
		formattedDate = prefix + new Intl.DateTimeFormat("es-VE", {
			day: "numeric",
			month: "short",
			year: "numeric"
		}).format(new Date(exchangeRate.date));
	} catch {
		formattedDate = prefix + new Intl.DateTimeFormat("es-VE", {
			day: "numeric",
			month: "short",
			year: "numeric"
		}).format(new Date());
	}
	const updatedLabel = document.querySelector("#rate-updated");
	const shoppingUpdatedLabel = document.querySelector("#shopping-rate-updated");
	if (updatedLabel) updatedLabel.textContent = formattedDate;
	if (shoppingUpdatedLabel) shoppingUpdatedLabel.textContent = formattedDate;
}

async function refreshReviewSummary() {
	try {
		const { data, error } = await supabaseClient.rpc("get_store_review_summary");
		if (error) {
			throw error;
		}
		const summary = Array.isArray(data) ? data[0] : data;
		const count = Number(summary?.review_count || 0);
		shoppingReviewAverage.textContent = count ? Number(summary.average_rating).toFixed(1) : "—";
		shoppingReviewCount.textContent = count ? `${count} ${count === 1 ? "reseña" : "reseñas"}` : "Aún sin reseñas";
	} catch {
		shoppingReviewAverage.textContent = "—";
		shoppingReviewCount.textContent = "Reseñas no disponibles";
	}
}

function updateAccountInterface() {
	const adminButtons = document.querySelectorAll('[data-view-target="sales-view"], [data-view-target="admin-view"]');
	adminButtons.forEach((button) => {
		button.hidden = !isStoreAdmin;
	});
	myOrdersButton.hidden = !currentUser;
	accountButton.hidden = Boolean(currentUser);
	signOutButton.hidden = !currentUser;
	accountButton.textContent = "Iniciar sesión";
}

async function applySession(session) {
	currentUser = session?.user || null;
	isStoreAdmin = false;
	if (currentUser) {
		const { data, error } = await supabaseClient.rpc("is_store_admin");
		if (error) {
			throw error;
		}
		isStoreAdmin = data === true;
	}
	updateAccountInterface();
	await refreshPaymentSettings();
	if (!isStoreAdmin) {
		document.querySelectorAll(".view-switch-button").forEach((button) => {
			const active = button.dataset.viewTarget === "shopping-view";
			button.classList.toggle("active", active);
			button.setAttribute("aria-pressed", String(active));
		});
		document.querySelectorAll(".app-view").forEach((view) => {
			view.hidden = view.id !== "shopping-view";
		});
	}
	await refreshStoreData();
}

async function loadLocalSupabaseConfig() {
	await new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "SUPABASE_CONFIG.LOCAL.JS";
		script.addEventListener("load", resolve, { once: true });
		script.addEventListener("error", () => reject(new Error("No se encontró SUPABASE_CONFIG.LOCAL.JS.")), { once: true });
		document.head.append(script);
	});
}

async function initializeBackend() {
	let config = window.LA_TIENDITA_SUPABASE;
	const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
	if ((!config?.url || !config?.anonKey) && window.location.protocol === "file:") {
		catalogFeedback.textContent = "Para iniciar sesión en una vista local, abre INICIO.HTML con Live Server en VS Code y configura SUPABASE_CONFIG.LOCAL.JS.";
		checkoutButton.disabled = true;
		return;
	}
	if ((!config?.url || !config?.anonKey) && localHost) {
		try {
			await loadLocalSupabaseConfig();
			config = window.LA_TIENDITA_SUPABASE;
		} catch (error) {
			catalogFeedback.textContent = `${error.message} Créalo en la carpeta del proyecto con tu Project URL y clave Publishable/anon.`;
			checkoutButton.disabled = true;
			return;
		}
	}
	if (!config?.url || !config?.anonKey) {
		catalogFeedback.textContent = localHost
			? "La vista local aún no está configurada. Completa SUPABASE_CONFIG.LOCAL.JS con tu Project URL y clave Publishable/anon."
			: "La tienda compartida aún no está configurada. Añade SUPABASE_URL y SUPABASE_ANON_KEY en los secretos de GitHub Actions.";
		checkoutButton.disabled = true;
		return;
	}
	if (!window.supabase?.createClient) {
		catalogFeedback.textContent = "No se pudo cargar el cliente de la tienda. Revisa tu conexión e inténtalo de nuevo.";
		checkoutButton.disabled = true;
		return;
	}
	try {
		supabaseClient = window.supabase.createClient(config.url, config.anonKey);
		const { data, error } = await supabaseClient.auth.getSession();
		if (error) {
			throw error;
		}
		await applySession(data.session);
		supabaseClient.auth.onAuthStateChange((_event, session) => {
			window.setTimeout(() => {
				applySession(session).catch((authError) => {
					catalogFeedback.textContent = `No se pudo actualizar tu sesión: ${getBackendError(authError)}`;
				});
			}, 0);
		});
		supabaseClient.channel("store-orders")
			.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
				refreshStoreData();
			})
			.on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
				refreshStoreData();
			})
			.subscribe();
	} catch (error) {
		catalogFeedback.textContent = `No se pudo conectar con la tienda: ${getBackendError(error)}`;
		checkoutButton.disabled = true;
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

function createInterfaceIcon(name) {
	const paths = {
		bag: "M6 8h12l1 13H5L6 8Zm3 0a3 3 0 0 1 6 0",
		chart: "M4 19V5m0 14h17M8 15l4-4 3 2 5-6",
		box: "m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8m-9 5v9",
		pin: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
		map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15",
		info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v6m0-10h.01",
		clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-16v6l4 2",
		check: "m5 12 4 4L19 6",
		receipt: "M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6m-6 4h6",
		trend: "M4 17l6-6 4 4 6-8m-6 0h6v6",
		search: "m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
		meat: "M4 14c-2-3 1-8 6-9 4-1 8 2 9 6 1 4-2 8-6 9-4 1-7-2-9-6Zm5-4h.01m5 7h.01m2-9 2-2",
		cheese: "m4 10 15-6 2 6v10H4V10Zm0 0 15 0m-9 0v3m5-3v2m-6 4h.01m5 2h.01",
		basket: "M3 10h18l-2 10H5L3 10Zm4 0 5-7 5 7m-9 4v3m5-3v3",
		drink: "M7 3h10l-1 18H8L7 3Zm1 5h8m-5-8v3",
		milk: "M8 3h8l2 4v14H6V7l2-4Zm0 4h10m-8 4h6",
		leaf: "M20 4C10 4 5 8 5 14c0 3 2 5 5 5 6 0 10-5 10-15ZM4 21c2-5 6-9 12-13"
	};
	const svgNamespace = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNamespace, "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "1.7");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");
	svg.setAttribute("focusable", "false");
	const path = document.createElementNS(svgNamespace, "path");
	path.setAttribute("d", paths[name] || paths.basket);
	svg.append(path);
	return svg;
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
	const boundedArc = Math.min(1, Math.max(0, arc));
	return 6371 * 2 * Math.atan2(Math.sqrt(boundedArc), Math.sqrt(1 - boundedArc));
}

function hasValidCoordinates(point) {
	return Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude) &&
		point.latitude >= -90 && point.latitude <= 90 &&
		point.longitude >= -180 && point.longitude <= 180;
}

function updateDeliveryEstimate() {
	if (!hasValidCoordinates(deliveryCoordinates)) {
		deliveryFee = 0;
		deliveryEstimate.hidden = true;
		return;
	}
	const distanceKm = distanceBetween(DELIVERY_ORIGIN, deliveryCoordinates);
	const zone = Math.max(1, Math.ceil(distanceKm / DELIVERY_ZONE_KM));
	deliveryFee = zone * DELIVERY_ZONE_PRICE;
	deliveryFeeLabel.textContent = formatMoney(deliveryFee);
	deliveryFeeBsLabel.textContent = formatBolivars(deliveryFee);
	deliveryZoneDescription.textContent = `Zona ${zone} · ${distanceKm.toFixed(1)} km en línea recta`;
	deliveryEstimate.hidden = false;
	if (cart.length > 0) {
		renderCart();
	}
}

function renderProducts() {
	catalogLoading.hidden = hasLoadedProducts;
	categoryFilters.hidden = !hasLoadedProducts;
	catalogToolbar.hidden = !hasLoadedProducts;
	emptyState.hidden = !hasLoadedProducts || products.length > 0;
	noResults.hidden = !hasLoadedProducts || products.length === 0;
	const searchTerm = normalizeProductText(searchInput.value);
	const visibleProducts = products.filter((product) =>
		normalizeProductText(`${product.name} ${product.brand} ${product.category}`).includes(searchTerm) &&
		(activeCategory === "Todos" || product.category === activeCategory) &&
		(!showAvailableOnly || product.stock > 0)
	);
	const sortComparators = {
		recommended: (first, second) =>
			Number(second.stock > 0) - Number(first.stock > 0) ||
			Number(getDiscountedPrice(second.price) < second.price) - Number(getDiscountedPrice(first.price) < first.price) ||
			first.name.localeCompare(second.name, "es"),
		"price-low": (first, second) =>
			getDiscountedPrice(first.price) - getDiscountedPrice(second.price) || first.name.localeCompare(second.name, "es"),
		"price-high": (first, second) =>
			getDiscountedPrice(second.price) - getDiscountedPrice(first.price) || first.name.localeCompare(second.name, "es"),
		name: (first, second) => first.name.localeCompare(second.name, "es")
	};
	visibleProducts.sort(sortComparators[catalogSort.value] || sortComparators.recommended);
	document.querySelectorAll("[data-category-count]").forEach((count) => {
		count.textContent = String(
			count.dataset.categoryCount === "Todos"
				? products.length
				: products.filter((product) => product.category === count.dataset.categoryCount).length
		);
	});
	catalogResultsCount.textContent = `${visibleProducts.length} de ${products.length} ${products.length === 1 ? "producto" : "productos"}`;
	clearCatalogFiltersButton.hidden = !searchTerm && activeCategory === "Todos" && !showAvailableOnly && catalogSort.value === "recommended";
	noResults.textContent = showAvailableOnly && products.some((product) => product.stock > 0)
		? "No encontramos productos disponibles con esos filtros."
		: "No encontramos productos con esos filtros.";
	catalogProducts.replaceChildren();

	for (const product of visibleProducts) {
		const discountedPrice = getDiscountedPrice(product.price);
		const weightProduct = isWeightProduct(product);
		const card = document.createElement("article");
		const lowStock = product.stock > 0 && product.stock <= (weightProduct ? 3000 : 3);
		card.className = `product-card${product.stock === 0 ? " product-card-soldout" : ""}`;
		const visual = document.createElement("div");
		const normalizedCategory = product.category.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		visual.className = `product-card-visual category-${normalizedCategory}`;
		const categoryIcons = {
			carnes: "meat",
			charcuteria: "cheese",
			viveres: "basket",
			bebidas: "drink",
			lacteos: "milk",
			otros: "leaf"
		};
		const imageUrl = getSafeProductImageUrl(product.imageUrl || "");
		if (imageUrl) {
			const image = document.createElement("img");
			image.className = "product-card-image";
			visual.classList.add("product-card-visual-has-image");
			image.alt = [product.brand, product.name].filter(Boolean).join(" ");
			image.loading = "lazy";
			image.decoding = "async";
			image.addEventListener("error", () => {
				image.remove();
				visual.classList.remove("product-card-visual-has-image");
				visual.setAttribute("aria-hidden", "true");
				visual.append(createInterfaceIcon(categoryIcons[normalizedCategory] || "basket"));
			}, { once: true });
			visual.append(image);
			image.src = imageUrl;
		} else {
			visual.setAttribute("aria-hidden", "true");
			visual.append(createInterfaceIcon(categoryIcons[normalizedCategory] || "basket"));
		}
		const details = document.createElement("div");
		details.className = "product-card-details";
		const category = document.createElement("span");
		category.className = "product-category-label";
		category.textContent = product.category;
		const brand = document.createElement("span");
		brand.className = "product-card-brand";
		brand.textContent = product.brand || "";
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
		details.append(category);
		if (product.brand) {
			details.append(brand);
		}
		details.append(status, name, price);

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

	emptyState.hidden = !hasLoadedProducts || products.length > 0;
	noResults.hidden = !hasLoadedProducts || products.length === 0 || visibleProducts.length > 0;
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
	const searchTerm = normalizeProductText(inventorySearchInput.value);
	const filter = stockFilter.value;
	const visibleProducts = products.filter((product) => {
		const matchesName = normalizeProductText(`${product.name} ${product.brand}`).includes(searchTerm);
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
		nameCell.className = "product-name-cell";
		const productName = document.createElement("span");
		productName.textContent = product.name;
		nameCell.append(productName);
		if (product.brand) {
			const productBrand = document.createElement("small");
			productBrand.textContent = product.brand;
			nameCell.append(productBrand);
		}
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
		updateButton.addEventListener("click", async () => {
			updateButton.disabled = true;
			updateButton.textContent = "Guardando...";
			try {
				await updateProductStock(product.id, stockInput.value);
			} finally {
				if (updateButton.isConnected) {
					updateButton.disabled = false;
					updateButton.textContent = "Guardar";
				}
			}
		});
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

function createOrderReviewForm(order) {
	const form = document.createElement("form");
	form.className = "purchase-review-form";
	form.dataset.orderReview = "";
	form.dataset.orderId = order.id;

	const heading = document.createElement("h3");
	heading.textContent = "¿Cómo fue tu experiencia?";
	const introduction = document.createElement("p");
	introduction.className = "purchase-review-form-intro";
	introduction.textContent = "Tu sonrisa nos inspira. Cuéntanos cómo te fue en tu compra.";
	const ratingFieldset = document.createElement("fieldset");
	ratingFieldset.className = "sales-review-rating";
	const ratingLegend = document.createElement("legend");
	ratingLegend.textContent = "Elige la carita que mejor describe tu experiencia";
	ratingFieldset.append(ratingLegend);
	const ratingFaces = [
		{ emoji: "😠", label: "Muy enojado" },
		{ emoji: "😞", label: "Insatisfecho" },
		{ emoji: "😐", label: "Regular" },
		{ emoji: "🙂", label: "Contento" },
		{ emoji: "😄", label: "Muy feliz" }
	];
	for (let rating = 1; rating <= 5; rating += 1) {
		const label = document.createElement("label");
		label.className = "sales-review-face";
		const input = document.createElement("input");
		input.type = "radio";
		input.name = `rating-${order.id}`;
		input.value = String(rating);
		input.setAttribute("aria-label", `${rating} de 5: ${ratingFaces[rating - 1].label}`);
		input.required = true;
		input.checked = order.review?.rating === rating;
		const face = document.createElement("span");
		face.setAttribute("aria-hidden", "true");
		face.textContent = ratingFaces[rating - 1].emoji;
		if (order.review?.rating >= rating) {
			label.classList.add("selected");
		}
		label.append(input, face);
		ratingFieldset.append(label);
	}

	const reasonLabel = document.createElement("label");
	reasonLabel.className = "sales-review-reason";
	reasonLabel.textContent = "Cuéntanos qué salió mal (obligatorio para las 2 caritas más negativas)";
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
	submit.textContent = "Enviar mi reseña";
	form.append(heading, introduction, ratingFieldset, reasonLabel, submit);
	return form;
}

function createSavedReviewMessage(review) {
	const message = document.createElement("div");
	message.className = "purchase-review-saved";
	const faces = document.createElement("div");
	faces.className = "purchase-review-saved-faces";
	faces.setAttribute("aria-label", `Calificación de ${review.rating} de 5`);
	for (let rating = 1; rating <= 5; rating += 1) {
		const face = document.createElement("span");
		face.setAttribute("aria-hidden", "true");
		face.textContent = ["😠", "😞", "😐", "🙂", "😄"][rating - 1];
		if (rating === review.rating) {
			face.classList.add("selected");
		}
		faces.append(face);
	}
	const thankYou = document.createElement("p");
	thankYou.className = "purchase-review-thank-you";
	thankYou.textContent = "¡Muchas gracias por compartir tu experiencia! Tu opinión hace crecer a La Tiendita.";
	message.append(faces, thankYou);
	return message;
}

function renderShoppingReviewSummary() {
	if (supabaseClient) {
		refreshReviewSummary();
	}
}

function renderPurchaseReviews(orderId) {
	purchaseReviewsList.replaceChildren();
	const ownOrders = isStoreAdmin ? orders.filter((entry) => entry.userId === currentUser.id) : orders;
	const matchingOrders = orderId
		? ownOrders.filter((entry) => entry.id === orderId && entry.status !== "rejected")
		: ownOrders.filter((entry) => entry.status !== "rejected");
	if (matchingOrders.length === 0) {
		const unavailable = document.createElement("p");
		unavailable.className = "purchase-reviews-empty";
		unavailable.textContent = "Todavía no tienes pedidos para reseñar.";
		purchaseReviewsList.append(unavailable);
		return;
	}
	for (const order of matchingOrders) {
		const card = document.createElement("article");
		card.className = "sales-order-card purchase-review-card";
		card.dataset.orderId = order.id;
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
		timestamp.textContent = `${getOrderStatusLabel(order.status)} · ${new Intl.DateTimeFormat("es-VE", {
			day: "numeric", month: "short", year: "numeric"
		}).format(new Date(order.createdAt))}`;
		heading.append(id, timestamp);
		const status = document.createElement("span");
		status.className = `sales-order-status status-${order.status}`;
		status.textContent = order.review ? "Reseñado" : getOrderStatusLabel(order.status);
		header.append(heading, status);
		card.append(header);
		if (order.review) {
			card.append(createSavedReviewMessage(order.review));
		} else if (order.receivedConfirmed) {
			card.append(createOrderReviewForm(order));
		} else {
			const prompt = document.createElement("div");
			prompt.className = "purchase-received-prompt";
			const message = document.createElement("p");
			message.textContent = "Cuando tengas el pedido contigo, confírmanos la recepción para dejar tu reseña.";
			const receivedButton = document.createElement("button");
			receivedButton.className = "purchase-received-button";
			receivedButton.type = "button";
			receivedButton.dataset.receivedOrderId = order.id;
			receivedButton.setAttribute("aria-label", `Confirmar recepción del pedido ${getOrderDisplayId(order)}`);
			const checkmark = document.createElement("span");
			checkmark.className = "purchase-received-check";
			checkmark.setAttribute("aria-hidden", "true");
			checkmark.textContent = "✓";
			receivedButton.append(checkmark, document.createTextNode("Ya recibí mi pedido"));
			prompt.append(message, receivedButton);
			card.append(prompt);
		}
		purchaseReviewsList.append(card);
	}
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

	const searchTerm = normalizeProductText(salesSearchInput.value);
	const visibleOrders = orders.filter((order) => {
		const matchesStatus = salesStatusFilter.value === "all" || order.status === salesStatusFilter.value;
		const searchableText = [
			getOrderDisplayId(order),
			order.id,
			order.paymentMethod,
			order.delivery?.location || "",
			...order.items.map((item) => item.name)
		].join(" ");
		return matchesStatus && (!searchTerm || normalizeProductText(searchableText).includes(searchTerm));
	});
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
		card.append(footer);
		salesOrdersList.append(card);
	}
	salesEmptyState.hidden = orders.length > 0;
	salesOrdersList.hidden = visibleOrders.length === 0;
	salesFilterEmpty.hidden = orders.length === 0 || visibleOrders.length > 0;
	salesFilterEmpty.textContent = searchTerm
		? "No encontramos pedidos que coincidan con esa búsqueda."
		: "No hay pedidos con este estado.";
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

function openPurchaseReviewDialog(orderId) {
	activeReviewOrderId = orderId;
	purchaseReviewsFeedback.textContent = "";
	renderPurchaseReviews(orderId);
	if (!purchaseReviewDialog.open) {
		purchaseReviewDialog.showModal();
	}
}

async function updateOrderStatus(orderId, nextStatus) {
	if (!supabaseClient) {
		salesFeedback.textContent = "La tienda no está conectada.";
		return;
	}
	const order = orders.find((entry) => entry.id === orderId);
	if (!order || !(
		(order.status === "pending" && ["accepted", "rejected"].includes(nextStatus)) ||
		(order.status === "accepted" && nextStatus === "completed")
	)) {
		return;
	}

	try {
		const { error } = await supabaseClient.rpc("admin_update_store_order_status", {
			p_order_id: orderId,
			p_next_status: nextStatus
		});
		if (error) {
			throw error;
		}
	} catch (error) {
		salesFeedback.textContent = `No se pudo actualizar ${getOrderDisplayId(order)}: ${getBackendError(error)}`;
		return;
	}
	await refreshStoreData();
	const updatedOrder = orders.find((entry) => entry.id === orderId);
	salesFeedback.textContent = nextStatus === "accepted"
		? `${getOrderDisplayId(updatedOrder || order)} aceptado. El inventario se actualizó.`
		: nextStatus === "rejected"
			? `${getOrderDisplayId(updatedOrder || order)} rechazado.`
			: `${getOrderDisplayId(updatedOrder || order)} marcado como completado.`;
}

function beginProductEdit(product) {
	editingProductId = product.id;
	lastSuggestedProductCategory = null;
	productNameInput.value = product.name;
	productBrandInput.value = product.brand || "";
	productImageUrlInput.value = product.imageUrl || "";
	updateProductImagePreview();
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
	updateProductImagePreview();
	productCategoryHint.textContent = "";
	configureProductFormMode();
	document.querySelector("#submit-product-button").textContent = "＋ Agregar al inventario";
	document.querySelector("#cancel-edit-button").hidden = true;
	formFeedback.textContent = "";
	formFeedback.classList.remove("error");
}

async function updateProductStock(productId, requestedStock) {
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
	const previousCart = cart.slice();
	try {
		const { error } = await supabaseClient
			.from("products")
			.update({ stock })
			.eq("id", productId);
		if (error) {
			throw error;
		}
		product.stock = stock;
		if (getCartQuantity(productId) > stock) {
			cart = cart.filter((item) => item.productId !== productId);
			showFeedback(`${product.name}: el stock se actualizó y se retiró del carrito porque excedía las existencias.`);
		} else {
			showFeedback(`${product.name}: existencias actualizadas a ${stock}.`);
		}
		renderProducts();
		renderCart();
	} catch (error) {
		cart = previousCart;
		showFeedback(`No se pudo guardar el inventario: ${getBackendError(error)}`, true);
		await refreshStoreData();
	}
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

async function confirmProductDeletion() {
	const product = products.find((item) => item.id === pendingDeleteProductId);
	pendingDeleteProductId = null;
	deleteConfirmDialog.close();
	if (!product) {
		return;
	}
	if (editingProductId === product.id) {
		cancelProductEdit();
	}
	try {
		const { error } = await supabaseClient.from("products").delete().eq("id", product.id);
		if (error) {
			throw error;
		}
	} catch (error) {
		showFeedback(`No se pudo eliminar el producto: ${getBackendError(error)}`, true);
		await refreshStoreData();
		return;
	}
	products = products.filter((item) => item.id !== product.id);
	cart = cart.filter((item) => item.productId !== product.id);
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
	mobileCartCount.textContent = `${cart.length} ${cart.length === 1 ? "producto" : "productos"}`;
	mobileCartTotal.textContent = formatMoney(total);
	mobileCartSummary.hidden = cart.length === 0;
	document.body.classList.toggle("has-cart-mobile", cart.length > 0);
	saveCart();
}

function openCheckout() {
	if (cart.length === 0) {
		return;
	}
	if (!currentUser) {
		accountFeedback.textContent = "Inicia sesión o crea una cuenta para confirmar tu pedido.";
		accountDialog.showModal();
		return;
	}
	if (deliveryToggle.checked && !hasValidCoordinates(deliveryCoordinates)) {
		deliveryFeedback.textContent = "Marca el punto de entrega en el mapa para calcular la zona y el costo.";
		openMapPickerButton.focus();
		return;
	}
	deliveryFeedback.textContent = "";
	checkoutFeedback.textContent = "";
	checkoutForm.reset();
	checkoutTotal.textContent = formatMoney(getOrderTotal());
	document.querySelector("#checkout-total-bs").textContent = formatBolivars(getOrderTotal());
	checkoutDelivery.hidden = !deliveryToggle.checked;
	checkoutDelivery.textContent = deliveryToggle.checked
		? `Delivery · ${getDeliveryLocation()} · ${deliveryZoneDescription.textContent} · ${formatMoney(deliveryFee)} (${formatBolivars(deliveryFee)}) · Coordina la entrega directamente con la tienda.`
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
	mapReverseGeocodeRequestId++;
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
			} else if (mapPickerProvider === "mapbox") {
				mapPickerMap.resize();
				mapPickerMap.jumpTo({
					center: [mapCenter.longitude, mapCenter.latitude],
					zoom: mapPickerCoordinates ? 16 : 13
				});
				scheduleNearbyPlacesSearch();
			} else {
				mapPickerMap.invalidateSize({ pan: false });
				mapPickerMap.setView(
					[mapCenter.latitude, mapCenter.longitude],
					mapPickerCoordinates ? 16 : 12,
					{ animate: false }
				);
			}
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
	const message = "Google Maps rechazó la clave. Se activará el mapa interactivo abierto.";
	mapPickerFeedback.textContent = message;
	mapPickerProvider = null;
	mapPickerMap = null;
	mapPickerMarker = null;
	if (mapPickerMapElement) {
		mapPickerMapElement.replaceChildren();
	}
	void updateMapPicker();
};

function loadLeafletLibrary() {
	if (window.L) {
		return Promise.resolve(window.L);
	}
	if (leafletLibraryPromise) {
		return leafletLibraryPromise;
	}
	leafletLibraryPromise = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		let timeoutId = window.setTimeout(() => {
			leafletLibraryPromise = null;
			reject(new Error("Leaflet tardó demasiado en responder."));
		}, 12000);
		script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
		script.addEventListener("load", () => {
			window.clearTimeout(timeoutId);
			timeoutId = 0;
			if (window.L) {
				resolve(window.L);
			} else {
				leafletLibraryPromise = null;
				reject(new Error("No se pudo inicializar Leaflet."));
			}
		}, { once: true });
		script.addEventListener("error", () => {
			window.clearTimeout(timeoutId);
			timeoutId = 0;
			leafletLibraryPromise = null;
			reject(new Error("No se pudo cargar Leaflet."));
		}, { once: true });
		document.head.append(script);
	});
	return leafletLibraryPromise;
}

function loadMapboxLibrary() {
	if (window.mapboxgl) {
		window.mapboxgl.accessToken = window.MAPBOX_PUBLIC_TOKEN;
		return Promise.resolve(window.mapboxgl);
	}
	if (!window.MAPBOX_PUBLIC_TOKEN) {
		return Promise.reject(new Error("No hay un token público de Mapbox configurado."));
	}
	if (mapboxLibraryPromise) {
		return mapboxLibraryPromise;
	}
	mapboxLibraryPromise = new Promise((resolve, reject) => {
		const stylesheetHref = "https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.css";
		if (!document.querySelector(`link[href="${stylesheetHref}"]`)) {
			const stylesheet = document.createElement("link");
			stylesheet.rel = "stylesheet";
			stylesheet.href = stylesheetHref;
			document.head.append(stylesheet);
		}
		const script = document.createElement("script");
		const timeoutId = window.setTimeout(() => {
			mapboxLibraryPromise = null;
			reject(new Error("Mapbox tardó demasiado en responder."));
		}, 15000);
		script.src = "https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.js";
		script.addEventListener("load", () => {
			window.clearTimeout(timeoutId);
			if (!window.mapboxgl) {
				mapboxLibraryPromise = null;
				reject(new Error("No se pudo inicializar Mapbox GL JS."));
				return;
			}
			window.mapboxgl.accessToken = window.MAPBOX_PUBLIC_TOKEN;
			resolve(window.mapboxgl);
		}, { once: true });
		script.addEventListener("error", () => {
			window.clearTimeout(timeoutId);
			mapboxLibraryPromise = null;
			reject(new Error("No se pudo cargar Mapbox GL JS."));
		}, { once: true });
		document.head.append(script);
	});
	return mapboxLibraryPromise;
}

async function initializeMapboxMap() {
	await loadMapboxLibrary();
	if (!window.mapboxgl.supported()) {
		throw new Error("Este navegador no es compatible con Mapbox.");
	}
	const center = mapPickerCoordinates || DELIVERY_ORIGIN;
	mapPickerMapElement.replaceChildren();
	mapPickerMap = new window.mapboxgl.Map({
		container: mapPickerMapElement,
		style: "mapbox://styles/mapbox/streets-v12",
		center: [center.longitude, center.latitude],
		zoom: mapPickerCoordinates ? 16 : 13,
		attributionControl: true
	});
	mapPickerProvider = "mapbox";
	mapPickerMap.addControl(new window.mapboxgl.NavigationControl({ showCompass: false }), "top-right");
	mapPickerMapStatusMessage.textContent = "Cargando el mapa de Mapbox…";
	mapPickerMapStatus.hidden = false;
	retryMapLoadButton.hidden = true;
	await new Promise((resolve, reject) => {
		let settled = false;
		const timeoutId = window.setTimeout(() => {
			if (!settled) {
				settled = true;
				reject(new Error("El mapa de Mapbox tardó demasiado en cargar."));
			}
		}, 20000);
		mapPickerMap.once("load", () => {
			window.clearTimeout(timeoutId);
			if (settled) {
				return;
			}
			settled = true;
			resolve();
		});
		mapPickerMap.on("error", (event) => {
			if (!settled && event.error) {
				window.clearTimeout(timeoutId);
				settled = true;
				reject(event.error);
			}
		});
	});
	mapPickerMapStatus.hidden = true;
	mapPickerMarker = new window.mapboxgl.Marker({ color: "#b54836", draggable: true })
		.setLngLat([center.longitude, center.latitude]);
	mapPickerMarker.on("dragend", () => {
		const position = mapPickerMarker.getLngLat();
		void setMapPickerSelection({ lat: position.lat, lng: position.lng });
	});
	if (mapPickerCoordinates) {
		mapPickerMarker.addTo(mapPickerMap);
	}
	mapPickerMap.on("click", (event) => {
		void setMapPickerSelection({ lat: event.lngLat.lat, lng: event.lngLat.lng }, true);
	});
	mapPickerMap.on("moveend", scheduleNearbyPlacesSearch);
	mapBusinessFeedback.textContent = "Mapa de Mapbox listo. Abastos y comercios se cargan como referencias.";
	scheduleNearbyPlacesSearch();
}

function discardMapboxMap() {
	if (mapPickerProvider === "mapbox" && mapPickerMap) {
		mapPickerMap.remove();
		mapPickerMap = null;
		mapPickerMarker = null;
		mapNearbyMarkers = [];
		mapNearbyLayer = null;
		mapPickerProvider = null;
	}
}

async function initializeLeafletMap() {
	if (!window.L) {
		mapPickerMapStatusMessage.textContent = "Cargando el mapa interactivo…";
		mapPickerMapStatus.hidden = false;
		retryMapLoadButton.hidden = true;
		try {
			await loadLeafletLibrary();
		} catch (error) {
			mapPickerMapStatusMessage.textContent = `${error.message} Revisa tu conexión e inténtalo de nuevo.`;
			retryMapLoadButton.hidden = false;
			mapPickerFeedback.textContent = "El selector no estará disponible hasta que cargue el mapa.";
			return false;
		}
	}
	const center = mapPickerCoordinates || DELIVERY_ORIGIN;
	mapPickerMapElement.replaceChildren();
	mapPickerMap = window.L.map(mapPickerMapElement, { scrollWheelZoom: true }).setView([center.latitude, center.longitude], mapPickerCoordinates ? 16 : 12);
	mapPickerProvider = "leaflet";
	const tileLayer = window.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
		maxZoom: 19,
		attribution: "Tiles &copy; Esri & OpenStreetMap"
	}).addTo(mapPickerMap);
	tileLayer.once("tileerror", () => {
		window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution: "&copy; OpenStreetMap"
		}).addTo(mapPickerMap);
	});
	mapPickerMapStatus.hidden = true;
	retryMapLoadButton.hidden = true;
	if (mapPickerCoordinates) {
		mapPickerMarker = window.L.marker([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude], { draggable: true }).addTo(mapPickerMap);
		mapPickerMarker.on("dragend", () => {
			const pos = mapPickerMarker.getLatLng();
			void setMapPickerSelection({ lat: pos.lat, lng: pos.lng }, true);
		});
	}
	mapPickerMap.on("click", (event) => {
		void setMapPickerSelection({ lat: event.latlng.lat, lng: event.latlng.lng }, true);
	});
	mapNearbyLayer = window.L.layerGroup().addTo(mapPickerMap);
	mapPickerMap.on("moveend", scheduleNearbyPlacesSearch);
	mapBusinessFeedback.textContent = "Mapa interactivo listo. Toca o arrastra el pin para fijar tu entrega.";
	scheduleNearbyPlacesSearch();
	return true;
}

function getNearbyPlaceCategory(properties) {
	const category = properties.osm_value;
	const categories = {
		supermarket: "Supermercado",
		convenience: "Abasto",
		grocery: "Abasto",
		greengrocer: "Frutas y verduras",
		bakery: "Panadería",
		butcher: "Carnicería",
		mall: "Centro comercial",
		shopping_mall: "Centro comercial",
		pharmacy: "Farmacia"
	};
	return categories[category] || (properties.osm_key === "amenity" ? "Punto de referencia" : "Comercio");
}

function getNearbyPlaceIcon(category) {
	if (category === "Supermercado") {
		return "S";
	}
	if (category === "Abasto") {
		return "A";
	}
	if (category === "Farmacia") {
		return "F";
	}
	if (category === "Centro comercial") {
		return "C";
	}
	return "•";
}

function getNearbyPlacesCacheKey(center) {
	return `${center.latitude.toFixed(3)},${center.longitude.toFixed(3)}`;
}

function scheduleNearbyPlacesSearch() {
	nearbyPlacesRequestId++;
	window.clearTimeout(nearbyPlacesSearchTimer);
	nearbyPlacesSearchTimer = window.setTimeout(() => {
		void loadNearbyPlaces();
	}, 700);
}

async function fetchNearbyPlaces(center) {
	const terms = ["abasto", "supermercado", "farmacia", "centro comercial"];
	const responses = await Promise.allSettled(terms.map(async (term) => {
		const searchUrl = new URL("https://photon.komoot.io/api/");
		searchUrl.searchParams.set("q", term);
		searchUrl.searchParams.set("limit", "12");
		searchUrl.searchParams.set("lat", String(center.latitude));
		searchUrl.searchParams.set("lon", String(center.longitude));
		const controller = new AbortController();
		const timeoutId = window.setTimeout(() => controller.abort(), 9000);
		let response;
		try {
			response = await fetch(searchUrl, { signal: controller.signal });
		} finally {
			window.clearTimeout(timeoutId);
		}
		if (!response.ok) {
			throw new Error(`La búsqueda de ${term} respondió HTTP ${response.status}.`);
		}
		const data = await response.json();
		return (data.features || []).map((feature) => {
			const [longitude, latitude] = feature.geometry?.coordinates || [];
			const properties = feature.properties || {};
			if (!hasValidCoordinates({ latitude, longitude })) {
				return null;
			}
			return {
				id: `${properties.osm_key || ""}/${properties.osm_value || ""}/${properties.osm_id || ""}/${latitude.toFixed(5)}/${longitude.toFixed(5)}`,
				name: properties.name || formatMapSuggestion(properties) || "Lugar cercano",
				category: getNearbyPlaceCategory(properties),
				latitude,
				longitude
			};
		}).filter(Boolean);
	}));
	const successfulResponses = responses.filter((response) => response.status === "fulfilled");
	if (successfulResponses.length === 0) {
		throw responses.find((response) => response.status === "rejected")?.reason ||
			new Error("El servicio de lugares cercanos no respondió.");
	}
	const uniquePlaces = new Map();
	for (const response of successfulResponses) {
		for (const place of response.value) {
			const distance = distanceBetween(center, place);
			if (distance > NEARBY_PLACE_RADIUS_KM || uniquePlaces.has(place.id)) {
				continue;
			}
			uniquePlaces.set(place.id, { ...place, distance });
		}
	}
	return [...uniquePlaces.values()]
		.sort((first, second) => first.distance - second.distance)
		.slice(0, 14);
}

function makeNearbyPlacePopup(place) {
	const popup = document.createElement("div");
	popup.className = "nearby-place-popup";
	const name = document.createElement("strong");
	name.textContent = place.name;
	const category = document.createElement("span");
	category.textContent = `${place.category} · ${place.distance.toFixed(1)} km aprox.`;
	popup.append(name, category);
	return popup;
}

function renderNearbyPlaces(places) {
	if (mapPickerProvider === "mapbox" && window.mapboxgl) {
		mapNearbyMarkers.forEach((marker) => marker.remove());
		mapNearbyMarkers = [];
		nearbyPlacesList.replaceChildren();
		for (const [index, place] of places.entries()) {
			const element = document.createElement("div");
			element.className = `nearby-map-marker nearby-map-marker-${place.category.toLowerCase().replaceAll(" ", "-")}`;
			element.setAttribute("role", "img");
			element.setAttribute("aria-label", `${place.name} · ${place.category}`);
			const markerLabel = document.createElement("span");
			markerLabel.setAttribute("aria-hidden", "true");
			markerLabel.textContent = getNearbyPlaceIcon(place.category);
			element.append(markerLabel);
			const popup = new window.mapboxgl.Popup({ offset: 18 }).setDOMContent(makeNearbyPlacePopup(place));
			const marker = new window.mapboxgl.Marker({ element })
				.setLngLat([place.longitude, place.latitude])
				.setPopup(popup)
				.addTo(mapPickerMap);
			mapNearbyMarkers.push(marker);

			const item = document.createElement("li");
			const button = document.createElement("button");
			button.type = "button";
			button.className = "nearby-place-button";
			button.dataset.nearbyPlaceIndex = String(index);
			const label = document.createElement("strong");
			label.textContent = place.name;
			const detail = document.createElement("small");
			detail.textContent = `${place.category} · ${place.distance.toFixed(1)} km`;
			button.append(label, detail);
			item.append(button);
			nearbyPlacesList.append(item);
			button.addEventListener("click", () => {
				mapPickerMap.flyTo({
					center: [place.longitude, place.latitude],
					zoom: Math.max(mapPickerMap.getZoom(), 16)
				});
				marker.togglePopup();
			});
		}
		mapBusinessFeedback.textContent = places.length
			? `${places.length} abastos y comercios mapeados a menos de ${NEARBY_PLACE_RADIUS_KM} km. Toca uno para ubicarlo.`
			: `No encontramos comercios mapeados a menos de ${NEARBY_PLACE_RADIUS_KM} km. La cobertura depende de los datos disponibles.`;
		return;
	}
	if (!mapNearbyLayer || !window.L) {
		return;
	}
	mapNearbyLayer.clearLayers();
	nearbyPlacesList.replaceChildren();
	for (const [index, place] of places.entries()) {
		const marker = window.L.marker([place.latitude, place.longitude], {
			icon: window.L.divIcon({
				className: `nearby-map-marker nearby-map-marker-${place.category.toLowerCase().replaceAll(" ", "-")}`,
				html: `<span aria-hidden="true">${getNearbyPlaceIcon(place.category)}</span>`,
				iconSize: [30, 30],
				iconAnchor: [15, 15]
			}),
			title: `${place.name} · ${place.category}`
		}).addTo(mapNearbyLayer);
		marker.bindPopup(makeNearbyPlacePopup(place));

		const item = document.createElement("li");
		const button = document.createElement("button");
		button.type = "button";
		button.className = "nearby-place-button";
		button.dataset.nearbyPlaceIndex = String(index);
		const label = document.createElement("strong");
		label.textContent = place.name;
		const detail = document.createElement("small");
		detail.textContent = `${place.category} · ${place.distance.toFixed(1)} km`;
		button.append(label, detail);
		item.append(button);
		nearbyPlacesList.append(item);
		button.addEventListener("click", () => {
			mapPickerMap.setView([place.latitude, place.longitude], Math.max(mapPickerMap.getZoom(), 16));
			marker.openPopup();
		});
	}
	mapBusinessFeedback.textContent = places.length
		? `${places.length} abastos y comercios mapeados a menos de ${NEARBY_PLACE_RADIUS_KM} km. Toca uno para ubicarlo.`
		: `No encontramos comercios mapeados a menos de ${NEARBY_PLACE_RADIUS_KM} km. La cobertura depende de los datos disponibles.`;
}

async function loadNearbyPlaces(forceRefresh = false) {
	if (!["leaflet", "mapbox"].includes(mapPickerProvider) || !mapPickerMap || !mapPickerDialog.open) {
		return;
	}
	const center = getMapPickerCenter();
	const cacheKey = getNearbyPlacesCacheKey(center);
	const cached = nearbyPlacesCache.get(cacheKey);
	if (!forceRefresh && cached && Date.now() - cached.createdAt < NEARBY_PLACES_CACHE_MS) {
		renderNearbyPlaces(cached.places);
		return;
	}
	const waitMs = NEARBY_PLACES_MIN_INTERVAL_MS - (Date.now() - nearbyPlacesLastRequestAt);
	if (waitMs > 0) {
		mapBusinessFeedback.textContent = "Actualizando lugares cercanos…";
		window.clearTimeout(nearbyPlacesSearchTimer);
		nearbyPlacesSearchTimer = window.setTimeout(() => {
			void loadNearbyPlaces(forceRefresh);
		}, waitMs);
		return;
	}
	const requestId = ++nearbyPlacesRequestId;
	nearbyPlacesLastRequestAt = Date.now();
	mapBusinessFeedback.textContent = "Buscando abastos y comercios cercanos…";
	try {
		const places = await fetchNearbyPlaces(center);
		if (requestId !== nearbyPlacesRequestId || !mapPickerDialog.open) {
			return;
		}
		nearbyPlacesCache.set(cacheKey, { createdAt: Date.now(), places });
		if (nearbyPlacesCache.size > 20) {
			const oldestKey = nearbyPlacesCache.keys().next().value;
			nearbyPlacesCache.delete(oldestKey);
		}
		renderNearbyPlaces(places);
	} catch (error) {
		if (requestId !== nearbyPlacesRequestId) {
			return;
		}
		mapBusinessFeedback.textContent = `No se pudieron cargar los comercios cercanos: ${getBackendError(error)}`;
		nearbyPlacesList.replaceChildren();
	}
}

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
	mapPickerMapStatus.hidden = true;
	retryMapLoadButton.hidden = true;
	mapPickerMarker = new window.google.maps.Marker({
		map: mapPickerCoordinates ? mapPickerMap : null,
		position: { lat: center.latitude, lng: center.longitude },
		draggable: true
	});
	mapPickerMarker.addListener("dragend", () => {
		const position = mapPickerMarker.getPosition();
		if (position) {
			void setMapPickerSelection({ lat: position.lat(), lng: position.lng() });
		}
	});
	mapPickerMap.addListener("click", (event) => {
		if (event.placeId) {
			event.stop();
			void selectGooglePlace(event.placeId);
		} else if (event.latLng) {
			void setMapPickerSelection({ lat: event.latLng.lat(), lng: event.latLng.lng() });
		}
	});
	mapPickerProvider = "google";
	mapBusinessFeedback.textContent = "Los comercios y lugares disponibles aparecen en Google Maps.";
}

async function updateMapPicker() {
	if (!mapPickerMap) {
		const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
		if (isLocalHost) {
			await Promise.all([loadLocalGoogleMapsConfig(), loadLocalMapboxConfig()]);
		}
		let mapInitialized = false;
		if (window.MAPBOX_PUBLIC_TOKEN) {
			try {
				await initializeMapboxMap();
				mapInitialized = true;
			} catch {
				discardMapboxMap();
				mapPickerMapElement.replaceChildren();
				mapPickerFeedback.textContent = "Mapbox no está disponible. Se intentará otro mapa; verifica que el token público tenga permisos y referentes correctos.";
			}
		}
		if (!mapInitialized && window.GOOGLE_MAPS_API_KEY) {
			try {
				await initializeGoogleMap();
				mapInitialized = true;
			} catch (error) {
				mapPickerFeedback.textContent = `Google Maps no está disponible: ${getBackendError(error)}. Se usará el mapa interactivo abierto.`;
			}
		}
		if (!mapInitialized && !await initializeLeafletMap()) {
			mapPickerFeedback.textContent = "No se pudo cargar ningún mapa. Revisa tu conexión e inténtalo de nuevo.";
		}
	}
	if (mapPickerCoordinates && mapPickerMap) {
		if (mapPickerProvider === "google") {
			const position = { lat: mapPickerCoordinates.latitude, lng: mapPickerCoordinates.longitude };
			mapPickerMap.setCenter(position);
			mapPickerMap.setZoom(16);
			mapPickerMarker.setPosition(position);
			mapPickerMarker.setMap(mapPickerMap);
		} else if (mapPickerProvider === "mapbox") {
			const position = [mapPickerCoordinates.longitude, mapPickerCoordinates.latitude];
			mapPickerMap.jumpTo({ center: position, zoom: 16 });
			mapPickerMarker.setLngLat(position).addTo(mapPickerMap);
		} else if (mapPickerProvider === "leaflet") {
			mapPickerMap.setView([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude], 16);
			if (mapPickerMarker) {
				mapPickerMarker.setLatLng([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude]);
			} else {
				mapPickerMarker = window.L.marker([mapPickerCoordinates.latitude, mapPickerCoordinates.longitude], { draggable: true }).addTo(mapPickerMap);
				mapPickerMarker.on("dragend", () => {
					const pos = mapPickerMarker.getLatLng();
					void setMapPickerSelection({ lat: pos.lat, lng: pos.lng }, true);
				});
			}
		}
	} else if (mapPickerInput.value.trim() && mapPickerMap) {
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
		mapPickerFeedback.textContent = "El mapa aún no está listo. Comprueba tu conexión e intenta de nuevo.";
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
		} else {
			const searchUrl = new URL("https://photon.komoot.io/api/");
			searchUrl.searchParams.set("q", query);
			searchUrl.searchParams.set("limit", "5");
			const mapCenter = getMapPickerCenter();
			searchUrl.searchParams.set("lat", String(mapCenter.latitude));
			searchUrl.searchParams.set("lon", String(mapCenter.longitude));
			const response = await fetch(searchUrl, { cache: "no-store" });
			if (!response.ok) {
				throw new Error("No se pudo consultar el servicio de búsqueda.");
			}
			const data = await response.json();
			if (requestId !== mapSuggestionRequestId || query !== mapPickerInput.value.trim()) {
				return;
			}
			mapSuggestionItems = (data.features || []).map((feature) => ({
				label: formatMapSuggestion(feature.properties),
				latitude: feature.geometry.coordinates[1],
				longitude: feature.geometry.coordinates[0],
				googlePlace: false
			})).filter((place) => place.label && hasValidCoordinates(place));
		}
		if (mapSuggestionItems.length === 0) {
			hideMapSuggestions();
			mapPickerFeedback.textContent = "No encontramos lugares con ese nombre. Intenta con otra referencia o toca el mapa.";
			return;
		}
		renderMapSuggestions();
		mapPickerFeedback.textContent = "Elige una sugerencia para ubicar el mapa.";
	} catch (error) {
		if (requestId !== mapSuggestionRequestId) {
			return;
		}
		hideMapSuggestions();
		mapPickerFeedback.textContent = `No se pudo buscar: ${getBackendError(error)}`;
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
		mapPickerFeedback.textContent = `No se pudo abrir ese lugar de Google Maps: ${getBackendError(error)}`;
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
				mapPickerFeedback.textContent = `No se pudo cargar el lugar: ${getBackendError(error)}`;
			}
		}
		return;
	}
	void setMapPickerSelection({ lat: place.latitude, lng: place.longitude }, false, place.label);
}

async function setMapPickerSelection(point, reverseGeocode = false, displayName = "") {
	const reverseRequestId = ++mapReverseGeocodeRequestId;
	if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) ||
		point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
		mapPickerFeedback.textContent = "No se pudo usar ese punto. Selecciona una ubicación válida en el mapa.";
		return;
	}
	mapPickerCoordinates = { latitude: point.lat, longitude: point.lng };
	if (mapPickerProvider === "google" && mapPickerMap) {
		const position = { lat: point.lat, lng: point.lng };
		mapPickerMap.setCenter(position);
		mapPickerMap.setZoom(Math.max(mapPickerMap.getZoom(), 15));
		mapPickerMarker.setPosition(position);
		mapPickerMarker.setMap(mapPickerMap);
	} else if (mapPickerProvider === "mapbox" && mapPickerMap) {
		const position = [point.lng, point.lat];
		mapPickerMap.flyTo({ center: position, zoom: Math.max(mapPickerMap.getZoom(), 15) });
		mapPickerMarker.setLngLat(position).addTo(mapPickerMap);
	} else if (mapPickerProvider === "leaflet" && mapPickerMap) {
		mapPickerMap.setView([point.lat, point.lng], Math.max(mapPickerMap.getZoom(), 15));
		if (mapPickerMarker) {
			mapPickerMarker.setLatLng([point.lat, point.lng]);
		} else {
			mapPickerMarker = window.L.marker([point.lat, point.lng], { draggable: true }).addTo(mapPickerMap);
			mapPickerMarker.on("dragend", () => {
				const pos = mapPickerMarker.getLatLng();
				void setMapPickerSelection({ lat: pos.lat, lng: pos.lng }, true);
			});
		}
	}
	mapPickerInput.value = displayName || `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
	mapPickerFeedback.textContent = "Punto marcado. Puedes arrastrar el pin para afinarlo.";
	void updateMapPicker();
	if (!reverseGeocode || mapPickerProvider === "google") {
		return;
	}
	try {
		const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
		reverseUrl.searchParams.set("format", "jsonv2");
		reverseUrl.searchParams.set("lat", String(point.lat));
		reverseUrl.searchParams.set("lon", String(point.lng));
		const controller = new AbortController();
		const timeoutId = window.setTimeout(() => controller.abort(), 8000);
		let response;
		try {
			response = await fetch(reverseUrl, { signal: controller.signal });
		} finally {
			window.clearTimeout(timeoutId);
		}
		if (!response.ok) {
			throw new Error("No se pudo consultar la dirección.");
		}
		const result = await response.json();
		if (reverseRequestId === mapReverseGeocodeRequestId && result.display_name) {
			mapPickerInput.value = result.display_name;
			mapPickerFeedback.textContent = "Dirección encontrada. Confirma para agregarla al pedido.";
			void updateMapPicker();
		}
	} catch {
		if (reverseRequestId === mapReverseGeocodeRequestId) {
			mapPickerFeedback.textContent = "Punto marcado. No pudimos obtener la dirección; se guardarán las coordenadas seleccionadas.";
		}
	}
}

function getMapPickerCenter() {
	if (!mapPickerMap) {
		return DELIVERY_ORIGIN;
	}
	const center = mapPickerMap.getCenter();
	if (mapPickerProvider === "google") {
		return { latitude: center.lat(), longitude: center.lng() };
	}
	if (mapPickerProvider === "mapbox") {
		return { latitude: center.lat, longitude: center.lng };
	}
	return { latitude: center.lat, longitude: center.lng };
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
	navigator.geolocation.getCurrentPosition(async (position) => {
		await setMapPickerSelection({ lat: position.coords.latitude, lng: position.coords.longitude });
		const accuracy = Math.round(position.coords.accuracy);
		mapPickerFeedback.textContent = `Ubicación actual lista (precisión aproximada: ±${accuracy} m). Revisa el pin y confirma.`;
		mapPickerCurrentLocationButton.disabled = false;
	}, (error) => {
		mapPickerFeedback.textContent = getGeolocationErrorMessage(error);
		mapPickerCurrentLocationButton.disabled = false;
	}, { enableHighAccuracy: true, timeout: 10000 });
}

function getGeolocationErrorMessage(error) {
	if (!navigator.geolocation) {
		return "Este navegador no permite obtener la ubicación actual.";
	}
	if (!window.isSecureContext) {
		return "El GPS requiere una conexión segura. Abre la tienda con Live Server o desde su sitio HTTPS.";
	}
	if (error?.code === 1) {
		return "No se autorizó el GPS. Permite el acceso a la ubicación en tu navegador e inténtalo de nuevo.";
	}
	if (error?.code === 2) {
		return "El dispositivo no pudo determinar la ubicación. Comprueba que el GPS esté activo.";
	}
	if (error?.code === 3) {
		return "La búsqueda de ubicación tardó demasiado. Inténtalo otra vez o marca el punto en el mapa.";
	}
	return "No se pudo obtener la ubicación. Revisa los permisos del navegador e inténtalo de nuevo.";
}

function showPaymentDetails(paymentMethod) {
	if (paymentMethod === "Pago móvil" && !isMobilePaymentConfigured()) {
		checkoutFeedback.textContent = "El comercio todavía no ha configurado los datos de pago móvil.";
		return;
	}
	if (paymentMethod === "Transferencia" && !isTransferPaymentConfigured()) {
		checkoutFeedback.textContent = "El comercio todavía no ha configurado los datos para transferencias.";
		return;
	}
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
			note: paymentSettings.cash_instructions
		},
		"Pago móvil": {
			icon: "↗",
			description: "Copia los datos para realizar el pago móvil.",
			fields: [
				...deliveryCharge,
				{ label: "Teléfono", value: paymentSettings.mobile_phone },
				{ label: "Cédula/RIF", value: paymentSettings.mobile_document },
				{ label: "Banco", value: paymentSettings.mobile_bank },
				{ label: "Monto en bolívares", value: formatBolivars(total) }
			],
			note: "Verifica el monto y los datos antes de confirmar el pago."
		},
		"Transferencia": {
			icon: "⇄",
			description: "Datos disponibles para transferencia bancaria.",
			fields: [
				...deliveryCharge,
				{ label: "Banco", value: paymentSettings.transfer_bank },
				{ label: "Número de cuenta", value: paymentSettings.transfer_account_number },
				{ label: "Titular", value: paymentSettings.transfer_account_holder },
				...(paymentSettings.transfer_document ? [{ label: "Cédula/RIF", value: paymentSettings.transfer_document }] : []),
				{ label: "Monto en bolívares", value: formatBolivars(total) }
			],
			note: "Verifica el número de cuenta y el monto antes de confirmar el pago."
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
		mapFeedback.textContent = `Ubicación GPS seleccionada (precisión aproximada: ±${Math.round(position.coords.accuracy)} m).`;
		deliveryFeedback.textContent = "";
		deliveryMapLink.value = `https://www.google.com/maps/search/?api=1&query=${deliveryCoordinates.latitude},${deliveryCoordinates.longitude}`;
		updateDeliveryEstimate();
		updateDeliveryMap();
		useCurrentLocationButton.disabled = false;
	}, (error) => {
		mapFeedback.textContent = getGeolocationErrorMessage(error);
		useCurrentLocationButton.disabled = false;
	}, { enableHighAccuracy: true, timeout: 10000 });
}

async function completePurchase(paymentMethod) {
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
	confirmButton.disabled = true;
	const deliveryLocation = deliveryToggle.checked ? getDeliveryLocation() : "";
	const delivery = deliveryLocation ? {
		location: deliveryLocation,
		latitude: deliveryCoordinates.latitude,
		longitude: deliveryCoordinates.longitude
	} : null;
	let result;
	try {
		result = await supabaseClient.rpc("place_store_order", {
			p_items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
			p_payment_method: paymentMethod,
			p_delivery: delivery
		});
	} catch (error) {
		confirmButton.disabled = false;
		checkoutFeedback.textContent = `No se pudo confirmar el pedido: ${getBackendError(error)}`;
		return;
	}
	confirmButton.disabled = false;
	if (result.error) {
		checkoutFeedback.textContent = `No se pudo confirmar el pedido: ${getBackendError(result.error)}`;
		return;
	}
	const order = mapReturnedOrder(result.data);
	const total = order.total;
	orders.unshift(order);

	purchaseMessage.textContent = `${getOrderDisplayId(order)} · Por aceptar · ${paymentMethod}`;
	purchaseTotal.textContent = formatMoney(total);
	document.querySelector("#purchase-total-bs").textContent = formatBolivars(total);
	document.querySelector("#purchase-delivery").textContent = deliveryLocation
		? `Pedido enviado a ventas · ${deliveryLocation} · ${formatMoney(order.delivery.fee)} (${formatBolivars(order.delivery.fee)})`
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
	showFeedback("Pedido enviado a la tienda. Está pendiente de aceptación.");
	renderCart();
	renderProducts();
	renderSales();
	openPurchaseReviewDialog(order.id);
}

productForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	const name = productNameInput.value.trim();
	const brand = productBrandInput.value.trim();
	const imageUrl = getSafeProductImageUrl(productImageUrlInput.value);
	const price = Number(productPriceInput.value);
	const stockAmount = Number(productStockInput.value);
	const saleMode = productSaleModeInput.value;
	const stock = getStoredStock(stockAmount, saleMode);
	const invalidWeightPrecision = saleMode === "weight" &&
		Math.abs(stockAmount * GRAMS_PER_KILOGRAM - stock) > 1e-6;

	if (productImageUrlInput.value.trim() && !imageUrl) {
		showFeedback("La foto debe tener un enlace HTTPS válido.", true);
		return;
	}
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
	const previousCart = cart.slice();
	let cartItemRemoved = false;
	let cartRemovedForSaleModeChange = false;
	if (editingProductId && !editedProduct) {
		showFeedback("No se encontró el producto que intentas editar. Actualiza la página e inténtalo de nuevo.", true);
		return;
	}
	if (editedProduct) {
		const saleModeChanged = editedProduct.saleMode !== saleMode;
		editedProduct.name = name;
		editedProduct.brand = brand;
		editedProduct.imageUrl = imageUrl;
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
			brand,
			imageUrl,
			price,
			category: productCategoryInput.value,
			saleMode,
			stock
		});
	}
	const savedProduct = editedProduct || products[products.length - 1];
	const submitButton = document.querySelector("#submit-product-button");
	submitButton.disabled = true;
	submitButton.textContent = editedProduct ? "Guardando cambios..." : "Guardando producto...";
	try {
		await saveProduct(savedProduct);
	} catch (error) {
		cart = previousCart;
		showFeedback(`No se pudo guardar el producto: ${getBackendError(error)}`, true);
		await refreshStoreData();
		return;
	} finally {
		submitButton.disabled = false;
	}
	lastSuggestedProductCategory = null;
	productForm.reset();
	updateProductImagePreview();
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
paymentSettingsForm.addEventListener("submit", savePaymentSettings);
searchProductImageButton.addEventListener("click", () => {
	const productName = productNameInput.value.trim();
	if (!productName) {
		showFeedback("Escribe primero el nombre del producto para buscar una imagen.", true);
		productNameInput.focus();
		return;
	}
	const query = [productBrandInput.value.trim(), productName, "producto empaque"]
		.filter(Boolean)
		.join(" ");
	const searchUrl = new URL("https://www.google.com/search");
	searchUrl.searchParams.set("tbm", "isch");
	searchUrl.searchParams.set("q", query);
	window.open(searchUrl.href, "_blank", "noopener,noreferrer");
});
productImageUrlInput.addEventListener("input", updateProductImagePreview);
productBrandInput.addEventListener("input", updateProductImageAlt);
catalogRetryButton.addEventListener("click", async () => {
	catalogRetryButton.disabled = true;
	catalogRetryButton.textContent = "Reintentando…";
	catalogLoadError = false;
	try {
		await refreshStoreData();
	} finally {
		catalogRetryButton.disabled = false;
		catalogRetryButton.textContent = "Intentar de nuevo";
	}
});
productNameInput.addEventListener("input", updateProductCategorySuggestion);
productNameInput.addEventListener("input", updateProductImageAlt);
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
searchInput.addEventListener("input", debounce(renderProducts, 120));
catalogSort.addEventListener("change", renderProducts);
availabilityFilter.addEventListener("click", () => {
	showAvailableOnly = !showAvailableOnly;
	availabilityFilter.setAttribute("aria-pressed", String(showAvailableOnly));
	availabilityFilter.classList.toggle("active", showAvailableOnly);
	renderProducts();
});
clearCatalogFiltersButton.addEventListener("click", () => {
	searchInput.value = "";
	catalogSort.value = "recommended";
	showAvailableOnly = false;
	availabilityFilter.setAttribute("aria-pressed", "false");
	availabilityFilter.classList.remove("active");
	activeCategory = "Todos";
	document.querySelectorAll(".category-filter").forEach((filterButton) => {
		const isActive = filterButton.dataset.category === "Todos";
		filterButton.classList.toggle("active", isActive);
		filterButton.setAttribute("aria-pressed", String(isActive));
	});
	renderProducts();
	searchInput.focus();
});
document.querySelector("#mobile-checkout-button").addEventListener("click", openCheckout);
inventorySearchInput.addEventListener("input", debounce(renderAdminProducts, 120));
stockFilter.addEventListener("change", renderAdminProducts);
categoryFilters.addEventListener("click", (event) => {
	const button = event.target.closest("button[data-category]");
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
		if (button.dataset.viewTarget !== "shopping-view" && !isStoreAdmin) {
			return;
		}
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
document.querySelector("#close-purchase-review").addEventListener("click", () => {
	purchaseReviewDialog.close();
	activeReviewOrderId = null;
});
purchaseReviewDialog.addEventListener("click", (event) => {
	if (event.target === purchaseReviewDialog) {
		purchaseReviewDialog.close();
		activeReviewOrderId = null;
	}
});
purchaseReviewDialog.addEventListener("close", () => {
	activeReviewOrderId = null;
});
salesStatusFilter.addEventListener("change", renderSales);
salesSearchInput.addEventListener("input", debounce(renderSales, 120));
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
		button.disabled = true;
		button.textContent = "Actualizando...";
		updateOrderStatus(button.dataset.orderId, nextStatus).finally(() => {
			if (button.isConnected) {
				button.disabled = false;
				button.textContent = button.dataset.orderAction === "accept"
					? "Aceptar pedido"
					: button.dataset.orderAction === "reject"
						? "Rechazar"
						: "Marcar como completado";
			}
		});
	}
});
purchaseReviewsList.addEventListener("change", (event) => {
	if (!event.target.matches(".sales-review-rating input")) {
		return;
	}
	const form = event.target.closest("[data-order-review]");
	const reasonLabel = form.querySelector(".sales-review-reason");
	const reasonInput = reasonLabel.querySelector("textarea");
	const isNegative = Number(event.target.value) <= 2;
	form.querySelectorAll(".sales-review-face").forEach((face, index) => {
		face.classList.toggle("selected", index === Number(event.target.value) - 1);
	});
	reasonLabel.hidden = !isNegative;
	reasonInput.required = isNegative;
});
purchaseReviewsList.addEventListener("click", (event) => {
	const button = event.target.closest("[data-received-order-id]");
	if (!button) {
		return;
	}
	const order = orders.find((entry) => entry.id === button.dataset.receivedOrderId);
	if (!order || order.status === "rejected") {
		purchaseReviewsFeedback.textContent = "No se puede confirmar la recepción de este pedido.";
		return;
	}
	button.disabled = true;
	supabaseClient.rpc("confirm_store_order_received", { p_order_id: order.id }).then(({ data, error }) => {
		button.disabled = false;
		if (error) {
			purchaseReviewsFeedback.textContent = `No se pudo confirmar la recepción: ${getBackendError(error)}`;
			return;
		}
		const updatedOrder = mapReturnedOrder(data);
		orders = orders.map((entry) => entry.id === updatedOrder.id ? updatedOrder : entry);
		purchaseReviewsFeedback.textContent = "¡Gracias! Ahora cuéntanos cómo fue tu experiencia.";
		renderPurchaseReviews(order.id);
	}).catch((error) => {
		button.disabled = false;
		purchaseReviewsFeedback.textContent = `No se pudo confirmar la recepción: ${getBackendError(error)}`;
	});
	return;
});
purchaseReviewsList.addEventListener("submit", async (event) => {
	const form = event.target.closest("[data-order-review]");
	if (!form) {
		return;
	}
	event.preventDefault();
	if (!form.reportValidity()) {
		return;
	}
	const order = orders.find((entry) => entry.id === form.dataset.orderId);
	if (order?.review) {
		purchaseReviewsFeedback.textContent = "Esta compra ya tiene una reseña. ¡Gracias por compartir tu opinión!";
		return;
	}
	if (!order || order.status === "rejected" || !order.receivedConfirmed) {
		purchaseReviewsFeedback.textContent = "Confirma primero que recibiste el pedido para poder reseñarlo.";
		return;
	}
	const rating = Number(form.querySelector('input[name^="rating-"]:checked')?.value);
	const reason = form.elements.reason.value.trim();
	if (!Number.isInteger(rating) || rating < 1 || rating > 5 || (rating <= 2 && !reason)) {
		purchaseReviewsFeedback.textContent = "Elige una carita y explica las 2 calificaciones más negativas.";
		return;
	}
	const submitButton = form.querySelector('button[type="submit"]');
	submitButton.disabled = true;
	let result;
	try {
		result = await supabaseClient.rpc("submit_store_order_review", {
			p_order_id: order.id,
			p_rating: rating,
			p_reason: reason
		});
	} catch (error) {
		submitButton.disabled = false;
		purchaseReviewsFeedback.textContent = `No se pudo guardar la reseña: ${getBackendError(error)}`;
		return;
	}
	submitButton.disabled = false;
	if (result.error) {
		purchaseReviewsFeedback.textContent = `No se pudo guardar la reseña: ${getBackendError(result.error)}`;
		return;
	}
	const updatedOrder = mapReturnedOrder(result.data);
	orders = orders.map((entry) => entry.id === updatedOrder.id ? updatedOrder : entry);
	renderShoppingReviewSummary();
	purchaseReviewDialog.close();
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
	mapReverseGeocodeRequestId++;
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
retryMapLoadButton.addEventListener("click", async () => {
	retryMapLoadButton.disabled = true;
	mapPickerMapStatusMessage.textContent = "Cargando el mapa…";
	try {
		await updateMapPicker();
	} finally {
		retryMapLoadButton.disabled = false;
	}
});
mapPickerDialog.addEventListener("close", () => {
	mapSuggestionRequestId++;
	mapReverseGeocodeRequestId++;
	nearbyPlacesRequestId++;
	window.clearTimeout(mapPickerSearchTimer);
	window.clearTimeout(nearbyPlacesSearchTimer);
	hideMapSuggestions();
});
refreshNearbyPlacesButton.addEventListener("click", () => {
	void loadNearbyPlaces(true);
});
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
accountButton.addEventListener("click", () => {
	accountFeedback.textContent = "";
	accountDialog.showModal();
});
document.querySelector("#close-account").addEventListener("click", () => accountDialog.close());
document.querySelector("#account-mode-toggle").addEventListener("click", (event) => {
	isCreatingAccount = !isCreatingAccount;
	event.currentTarget.textContent = isCreatingAccount ? "Ya tengo una cuenta" : "Crear cuenta nueva";
	document.querySelector("#account-title").textContent = isCreatingAccount ? "Crea tu cuenta" : "Bienvenido a La Tiendita";
	document.querySelector("#account-description").textContent = isCreatingAccount
		? "Regístrate con tu correo para realizar compras y consultar tus pedidos."
		: "Inicia sesión para comprar y consultar tus pedidos.";
	document.querySelector("#account-form button[type='submit']").textContent = isCreatingAccount ? "Crear cuenta" : "Iniciar sesión";
	document.querySelector("#account-password").autocomplete = isCreatingAccount ? "new-password" : "current-password";
	accountFeedback.textContent = "";
});
accountForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	accountFeedback.textContent = "";
	if (!supabaseClient) {
		accountFeedback.textContent = "La tienda todavía no está configurada. Inténtalo nuevamente cuando se active el servicio.";
		return;
	}
	const submitButton = accountForm.querySelector('button[type="submit"]');
	submitButton.disabled = true;
	const credentials = {
		email: accountForm.elements.email.value.trim(),
		password: accountForm.elements.password.value
	};
	try {
		const result = isCreatingAccount
			? await supabaseClient.auth.signUp(credentials)
			: await supabaseClient.auth.signInWithPassword(credentials);
		if (result.error) {
			throw result.error;
		}
		if (isCreatingAccount && !result.data.session) {
			accountFeedback.textContent = "Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesión.";
			return;
		}
		accountDialog.close();
		accountForm.reset();
	} catch (error) {
		accountFeedback.textContent = `No se pudo completar el acceso: ${getBackendError(error)}`;
	} finally {
		submitButton.disabled = false;
	}
});
signOutButton.addEventListener("click", async () => {
	if (!supabaseClient) {
		return;
	}
	try {
		const { error } = await supabaseClient.auth.signOut();
		if (error) {
			throw error;
		}
	} catch (error) {
		catalogFeedback.textContent = `No se pudo cerrar sesión: ${getBackendError(error)}`;
	}
});
myOrdersButton.addEventListener("click", () => openPurchaseReviewDialog(null));
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
document.querySelectorAll("[data-icon]").forEach((element) => {
	element.append(createInterfaceIcon(element.dataset.icon));
});
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
renderProducts();
renderCart();
renderSales();
renderShoppingReviewSummary();
updatePaymentMethodAvailability();
renderExchangeRate();
loadDailyRate();
initializeBackend();
