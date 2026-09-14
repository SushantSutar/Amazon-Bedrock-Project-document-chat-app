import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

function client() {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

async function invokeJson(modelId, payload) {
  const response = await client().send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    }),
  );
  return JSON.parse(Buffer.from(response.body).toString("utf8"));
}

function friendlyBedrockError(error) {
  const message = error?.message || String(error);
  if (/INVALID_PAYMENT_INSTRUMENT|payment instrument|Marketplace subscription/i.test(message)) {
    return "Claude needs a valid payment method on the AWS account. This app now uses Amazon Nova Lite, which already works in ap-south-1.";
  }
  if (/AccessDeniedException|not authorized|is not authorized/i.test(message)) {
    return "IAM user cannot call Bedrock. Attach bedrock:InvokeModel to doc-chat-local.";
  }
  if (/ResourceNotFoundException|isn't supported|ValidationException|model identifier/i.test(message)) {
    return "This model is not enabled in ap-south-1. Open Amazon Bedrock → Model access and enable Amazon Nova Lite plus Titan Text Embeddings V2.";
  }
  if (/use case details|agreement|access/i.test(message)) {
    return "Enable the models first: Amazon Bedrock → Model access → Amazon Nova Lite and Titan Text Embeddings V2.";
  }
  return message;
}

export async function embedText(text) {
  try {
    const parsed = await invokeJson(process.env.BEDROCK_EMBED_MODEL_ID, {
      inputText: text.slice(0, 8000),
      dimensions: 512,
      normalize: true,
    });
    if (!Array.isArray(parsed.embedding)) {
      throw new Error("Bedrock embedding response was empty.");
    }
    return parsed.embedding;
  } catch (error) {
    throw new Error(friendlyBedrockError(error));
  }
}

function isNova(modelId) {
  return String(modelId || "").includes("amazon.nova");
}

export async function askWithContext({ context, history, question }) {
  try {
    const modelId = process.env.BEDROCK_MODEL_ID;
    const system = [
      "You are a RAG document assistant.",
      "Answer only from the retrieved document chunks.",
      "If the chunks do not contain the answer, say you cannot find it in the document.",
      "Keep answers clear and concise.",
      "",
      "Retrieved chunks:",
      context,
    ].join("\n");

    if (isNova(modelId)) {
      const messages = history.slice(-8).map((item) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: [{ text: item.content }],
      }));
      messages.push({
        role: "user",
        content: [{ text: question }],
      });

      const parsed = await invokeJson(modelId, {
        system: [{ text: system }],
        messages,
        inferenceConfig: { maxTokens: 1024 },
      });
      const text = parsed?.output?.message?.content?.map((part) => part.text).join("\n").trim();
      if (!text) {
        throw new Error("Bedrock returned an empty answer.");
      }
      return text;
    }

    const parsed = await invokeJson(modelId, {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      system,
      messages: [
        ...history.slice(-8).map((item) => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: [{ type: "text", text: item.content }],
        })),
        {
          role: "user",
          content: [{ type: "text", text: question }],
        },
      ],
    });

    const text = parsed?.content?.map((part) => part.text).join("\n").trim();
    if (!text) {
      throw new Error("Bedrock returned an empty answer.");
    }
    return text;
  } catch (error) {
    throw new Error(friendlyBedrockError(error));
  }
}
