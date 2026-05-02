import { Webhook } from "standardwebhooks";

export default {
	async fetch(request, env): Promise<Response> {
		// Handle POST requests
		if (request.method === "POST") {
			const payload = await request.text();
			const headers: Record<string, string> = {};
			request.headers.forEach((value, key) => {
				headers[key] = value;
			});

			try {
				const wh = new Webhook(env.WEBHOOK_SIGNING_SECRET);
				const event = wh.verify(payload, headers) as Record<string, any>;

				// Process thin payload contents
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
