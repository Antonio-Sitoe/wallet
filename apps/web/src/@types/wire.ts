export type Wire<T> = {
	[K in keyof T]: T[K] extends Date
		? string
		: T[K] extends Date | undefined
			? string | undefined
			: T[K];
};
