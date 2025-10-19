/// <reference types="@webgpu/types" />

import { LOCATION_UPGRADE_CONFIGURATION } from "@angular/common/upgrade";
import { AfterViewInit, ChangeDetectionStrategy, Component, NgZone, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { animationFrames, BehaviorSubject, throttleTime } from "rxjs";

@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements AfterViewInit {
	constructor(private ngZone: NgZone) {}
	async ngAfterViewInit(): Promise<void> {
		const adapter = await navigator.gpu?.requestAdapter();
		const device = await adapter?.requestDevice();

		if (!device) {
			return;
		}
		const canvas = document.querySelector("canvas");

		this.ngZone.runOutsideAngular(async () => {
			const observer = new ResizeObserver(entries => {
				for (const entry of entries) {
					const width = entry.contentBoxSize[0].inlineSize;
					const height = entry.contentBoxSize[0].blockSize;
					const canvas = entry.target as any;
					canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
					canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
				}
			});
			observer.observe(canvas!);
		});

		const context = canvas?.getContext("webgpu");
		const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
		context?.configure({
			device,
			format: presentationFormat,
		});
		const shaderCode = await fetch("/assets/shaders/shader1.wgsl").then(
			(r) => r.text(),
		);
		const module = device.createShaderModule({
			label: "our hardcoded red triangle shaders",
			code: shaderCode,
		});
		const pipeline = device.createRenderPipeline({
			label: "our hardcoded red triangle pipeline",
			layout: "auto",
			vertex: {
				entryPoint: "vs",
				module,
			},
			fragment: {
				entryPoint: "fs",
				module,
				targets: [{ format: presentationFormat }],
			},
		});
		const colorAttachments: GPURenderPassColorAttachment[] = [
			{
				view: undefined as unknown as GPUTextureView,
				loadOp: "clear",
				storeOp: "store",
				clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
			},
		];

		const kNumObjects = 100_000;
		// Uniform buffer.
		const staticUnitSize =
			4 * 4 + // color is 4 32bit floats (4bytes each)
			2 * 4 + // offset is 2 32bit floats (4bytes each)
			2 * 4; // padding
		const staticStorageBufferSize = staticUnitSize * kNumObjects;
		const entities = Array(kNumObjects).fill(undefined);
		const staticStorageBuffer = device.createBuffer({
			label: "color and offset storage buffer",
			size: staticStorageBufferSize,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		const staticEntities = entities.map((_, i) => {
			const pos = [Math.random() * 2 - 1, Math.random() * 2 - 1]; // clip space X and Y.
			const color = [Math.random(), Math.random(), Math.random(), 1];
			return { pos, color };
		});
		const bytesPerFloat = 4;
		const staticStorageValues = new Float32Array(staticStorageBufferSize / bytesPerFloat);
		staticEntities.forEach((obj, i) => {
			const staticOffset = i * (staticUnitSize / bytesPerFloat);
			// offsets to the various uniform values in float32 indices
			const kColorOffset = 0;
			const kOffsetOffset = 4;
			staticStorageValues.set(obj.color, staticOffset + kColorOffset);
			staticStorageValues.set(obj.pos, staticOffset + kOffsetOffset);
		});
		// Updates only once. Copy storage to queue, enqueue only once.
		device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);

		const vertexData = entities.map(_ => {
			return [
				0.0, 0.5,	// top
				-0.5, -0.5,	// bottom left
				0.5, -0.5	// bottom right
			];
		}).flatMap(xs => xs);
		const posStorageValues = new Float32Array(vertexData);
		const posStorageBuffer = device.createBuffer({
			label: `scale only storage buffer`,
			size: posStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		device.queue.writeBuffer(posStorageBuffer, 0, posStorageValues);

		const changingUnitSize = 2 * 4; // scale is 2 32bit floats (4bytes each)
		const changingStorageBuferSize = changingUnitSize * kNumObjects;
		const changingStorageBuffer = device.createBuffer({
			label: `scale only storage buffer`,
			size: changingStorageBuferSize,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		// Set initial scale: Scale only changing.
		const changingStorageValues = new Float32Array(changingStorageBuferSize / bytesPerFloat);

		// Create one bind group.
		const bindGroup = device.createBindGroup({
			label: `Our first bind group (scale)`,
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: staticStorageBuffer }, },
				{ binding: 1, resource: { buffer: changingStorageBuffer }, },
				{ binding: 2, resource: { buffer: posStorageBuffer }, },
			],
		});

		// Render Loop.

		animationFrames()
			// .pipe(throttleTime(100))
			.subscribe(_ => {

			const renderPassDescriptor: GPURenderPassDescriptor = {
				label: "our basic canvas renderpass",
				colorAttachments: colorAttachments,
			};
			colorAttachments[0].view = context!?.getCurrentTexture().createView();

			const encoder = device.createCommandEncoder({ label: "our encoder" });
			const pass = encoder.beginRenderPass(renderPassDescriptor);
			pass.setPipeline(pipeline);

			// Update scale.
			entities.forEach((_, i) => {
				const newScale = [Math.random(), Math.random()] as [number, number];
				const offset = i * (changingUnitSize / bytesPerFloat);
				const kScaleOffset = 0;
				// Set the scale in values.
				changingStorageValues.set(newScale, offset + kScaleOffset);
			})
			// Upload all scales at once.
			device.queue.writeBuffer(changingStorageBuffer, 0, changingStorageValues);
			// Assign resource
			pass.setBindGroup(0, bindGroup);
			// draw single pass. Not draw yet, Store it as a command.
			pass.draw(3, kNumObjects);

			pass.end();
			const commandBuffer = encoder.finish();
			device.queue.submit([commandBuffer]);
		});
	}
}
