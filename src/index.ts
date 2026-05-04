import { Webhook } from "standardwebhooks";

export default {
	async fetch(request, env): Promise<Response> {
		console.log(`Incoming request: ${request.method} ${request.url}`);

		// Handle POST requests
		if (request.method === "POST") {
			const payload = await request.text();
			console.log("Payload:", payload);
			const headers: Record<string, string> = {};
			request.headers.forEach((value, key) => {
				headers[key] = value;
			});

			console.log("Headers:", JSON.stringify(headers));
			console.log("Secret: ", env.WEBHOOK_SIGNING_SECRET);

			try {
				const wh = new Webhook(env.WEBHOOK_SIGNING_SECRET, { format: "raw" });
				const event = wh.verify(payload, headers) as Record<string, any>;

				// Process webhook event
				console.log("Verified event:", JSON.stringify(event));
				if (event.type === "batch.completed" || event.type === "video.generated") {
					const uri = event.data.output_file_uri;
					console.log(`Job finished! Results at: ${uri}`);
				}

				return Response.json({ status: "received" }, { status: 200 });
			} catch (e) {
				console.error("Webhook verification failed:", e);
				return Response.json({ error: "Signature invalid" }, { status: 400 });
			}
		}

		if (request.method === "GET") {
			return new Response("Worker is running!");
		}

		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
