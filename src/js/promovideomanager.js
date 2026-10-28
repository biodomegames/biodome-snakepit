/** Fallback when full promo video assets are not in the project. */
export const promoVideoManager = {
	isInitialized: false,
	initialize(_ui) {
		this.isInitialized = true
	},
	showPromoVideo(onDone) {
		onDone && onDone(true)
	},
}
