<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLSelectAttributes } from "svelte/elements";

	type NativeSelectProps = Omit<WithElementRef<HTMLSelectAttributes, HTMLSelectElement>, "size"> & {
		size?: "sm" | "default";
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		size = "default",
		children,
		...restProps
	}: NativeSelectProps = $props();
</script>

<div
	class={cn(
		"group/native-select w-full has-[select:disabled]:opacity-50",
		className
	)}
	data-slot="native-select-wrapper"
	data-size={size}
>
	<select
		bind:value
		bind:this={ref}
		data-slot="native-select"
		data-size={size}
		class="border-input bg-card text-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive h-10 w-full min-w-0 cursor-pointer appearance-auto rounded-md border py-2 pr-2 pl-3 text-sm leading-5 shadow-xs transition-[border-color,box-shadow] focus-visible:ring-3 aria-invalid:ring-3 data-[size=sm]:h-9 data-[size=sm]:py-1.5 outline-none disabled:cursor-not-allowed"
		{...restProps}
	>
		{@render children?.()}
	</select>
</div>
