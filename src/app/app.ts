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

		// Render

		const encoder = device.createCommandEncoder({ label: "our encoder" });
		const pass = encoder.beginRenderPass(renderPassDescriptor);
		pass.setPipeline(pipeline);
		pass.draw(3);
		pass.end();
		const commandBuffer = encoder.finish();
		device.queue.submit([commandBuffer]);
	}
}
