/// <reference types="@webgpu/types" />

import { AfterViewInit, Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { BehaviorSubject } from "rxjs";


@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
})
export class App implements AfterViewInit {
	constructor() {
	}
	async ngAfterViewInit(): Promise<void> {
		const adapter = await navigator.gpu?.requestAdapter();
		const device = await adapter?.requestDevice();

		if (!device) {
			return;
		}
		const canvas = document.querySelector('canvas');
		const context = canvas?.getContext('webgpu');
		const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
		context?.configure({
			device,
			format: presentationFormat
		});
		const shaderCode = await fetch('/assets/shaders/shader1.wgsl').then(r => r.text());
		const module = device.createShaderModule({
			label: "our hardcoded red triangle shaders",
			code: shaderCode
		});
		const pipeline = device.createRenderPipeline({
			label: "our hardcoded red triangle pipeline",
			layout: 'auto',
			vertex: {
				entryPoint: 'vs',
				module,
			},
			fragment: {
				entryPoint: 'fs',
				module,
				targets: [{ format: presentationFormat }]
			}
		});
		const colorAttachments: GPURenderPassColorAttachment[] = [{
			view: undefined as unknown as GPUTextureView,
			loadOp: 'clear',
			storeOp: 'store',
			clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
		}];
		const renderPassDescriptor: GPURenderPassDescriptor = {
			label: "our basic canvas renderpass",
			colorAttachments: colorAttachments
		}
		colorAttachments[0].view =
			context!?.getCurrentTexture().createView();

		// Uniform buffer.
		const uniformBufferSize = (
			4 * 4 + // color is 4 32bit floats (4bytes each)
			2 * 4 + // scale is 2 32bit floats (4bytes each)
			2 * 4 // offset is 2 32bit floats (4bytes each)
		);
		const uniformBuffer = device.createBuffer({
			size: uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const chunk = 4;
		const uniformValues = new Float32Array(uniformBufferSize / chunk);
		// offsets to the various uniform values in float32 indices
		const kColorOffset = 0;
		const kScaleOffset = 4;
		const kOffsetOffset = 6;
		uniformValues.set([0, 1, 0, 1], kColorOffset);
		uniformValues.set([-0.5, -0.25], kOffsetOffset);

		const bindGroup = device.createBindGroup({
			label: "Our first bind group",
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: uniformBuffer } },
			]
		});

		// Modify the unniform buffer again . // remaining.
		uniformValues.set([0.5, 0.5], kScaleOffset);

		device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

		// Render

		const encoder = device.createCommandEncoder({ label: "our encoder" });
		const pass = encoder.beginRenderPass(renderPassDescriptor);
		pass.setPipeline(pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(3);
		pass.end();
		const commandBuffer = encoder.finish();
		device.queue.submit([commandBuffer]);
	}
}
