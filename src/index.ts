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

			try {
				const secret = env.WEBHOOK_SIGNING_SECRET;
				console.log("WEBHOOK_SIGNING_SECRET:", secret);

				const msgId = headers["webhook-id"];
				const msgTimestamp = headers["webhook-timestamp"];
				const msgSignature = headers["webhook-signature"];
				const receivedSig = msgSignature.split(",")[1]; // strip "v1,"

				const encoder = new TextEncoder();
				const toSign = `${msgId}.${msgTimestamp}.${payload}`;
				const toSignBytes = encoder.encode(toSign);

				// Try different key derivations
				const keyOptions: Record<string, Uint8Array> = {};

				// 1) Raw UTF-8 bytes of the full secret (including whsec_ if present)
				keyOptions["raw_full"] = encoder.encode(secret);

				// 2) Raw UTF-8 bytes without whsec_ prefix
				const stripped = secret.startsWith("whsec_") ? secret.substring(6) : secret;
				keyOptions["raw_stripped"] = encoder.encode(stripped);

				// 3) Base64-decode the full secret
				try {
					const decoded = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
					keyOptions["b64_full"] = decoded;
				} catch { keyOptions["b64_full_error"] = new Uint8Array(); }

				// 4) Base64-decode after stripping whsec_
				try {
					const decoded = Uint8Array.from(atob(stripped), c => c.charCodeAt(0));
					keyOptions["b64_stripped"] = decoded;
				} catch { keyOptions["b64_stripped_error"] = new Uint8Array(); }

				console.log("Received signature:", receivedSig);

				for (const [name, keyBytes] of Object.entries(keyOptions)) {
					if (name.endsWith("_error")) {
						console.log(`  ${name}: could not decode`);
						continue;
					}
					const key = await crypto.subtle.importKey(
						"raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
					);
					const sig = await crypto.subtle.sign("HMAC", key, toSignBytes);
					const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
					const match = b64 === receivedSig ? "✅ MATCH" : "❌ no match";
					console.log(`  ${name}: ${b64} ${match}`);
				}

				// Webhook library verification attempt
				try {
					const wh = new Webhook(env.WEBHOOK_SIGNING_SECRET, { format: "raw" });
					const libEvent = wh.verify(payload, headers);
					console.log("Library verification: ✅ SUCCESS", JSON.stringify(libEvent));
				} catch (libErr) {
					console.log("Library verification: ❌ FAILED", (libErr as Error).message);
				}

				// Verify signature using crypto.subtle (raw UTF-8 bytes of full secret)
				const hmacKey = await crypto.subtle.importKey(
					"raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
				);
				const computedSig = await crypto.subtle.sign("HMAC", hmacKey, toSignBytes);
				const computedB64 = btoa(String.fromCharCode(...new Uint8Array(computedSig)));

				if (computedB64 !== receivedSig) {
					return Response.json({ error: "Signature invalid" }, { status: 400 });
				}

				const event = JSON.parse(payload);
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
