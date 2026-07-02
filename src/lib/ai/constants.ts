export interface AiModelPricing {
  model: string;
  name: string;
  inputPricePerM: number;
  cachedInputPricePerM: number;
  outputPricePerM: number;
  description: string;
}

/**
 * Danh sách bảng giá và mô hình AI chuẩn theo docs/AI docs/pricing.md
 */
export const AI_MODEL_PRICING_LIST: AiModelPricing[] = [
  { model: "gpt-5.5", name: "gpt-5.5 (<272K context length)", inputPricePerM: 5, cachedInputPricePerM: 0.5, outputPricePerM: 30, description: "Mô hình gpt-5.5 context dài" },
  { model: "gpt-5.5-pro", name: "gpt-5.5-pro (<272K context length)", inputPricePerM: 30, cachedInputPricePerM: 0, outputPricePerM: 180, description: "Mô hình gpt-5.5 pro cao cấp" },
  { model: "gpt-5.4", name: "gpt-5.4 (<272K context length)", inputPricePerM: 2.5, cachedInputPricePerM: 0.25, outputPricePerM: 15, description: "Mô hình gpt-5.4 context dài" },
  { model: "gpt-5.4-mini", name: "gpt-5.4-mini", inputPricePerM: 0.75, cachedInputPricePerM: 0.075, outputPricePerM: 4.5, description: "Mô hình gpt-5.4 mini" },
  { model: "gpt-5.4-nano", name: "gpt-5.4-nano", inputPricePerM: 0.2, cachedInputPricePerM: 0.02, outputPricePerM: 1.25, description: "Mô hình gpt-5.4 nano siêu nhỏ gọn" },
  { model: "gpt-5.4-pro", name: "gpt-5.4-pro (<272K context length)", inputPricePerM: 30, cachedInputPricePerM: 0, outputPricePerM: 180, description: "Mô hình gpt-5.4 pro cao cấp" },
  { model: "gpt-5.2", name: "gpt-5.2", inputPricePerM: 1.75, cachedInputPricePerM: 0.175, outputPricePerM: 14, description: "Mô hình gpt-5.2 tiêu chuẩn" },
  { model: "gpt-5.2-pro", name: "gpt-5.2-pro", inputPricePerM: 21, cachedInputPricePerM: 0, outputPricePerM: 168, description: "Mô hình gpt-5.2 pro cao cấp" },
  { model: "gpt-5.1", name: "gpt-5.1", inputPricePerM: 1.25, cachedInputPricePerM: 0.125, outputPricePerM: 10, description: "Mô hình gpt-5.1 tiêu chuẩn" },
  { model: "gpt-5", name: "gpt-5", inputPricePerM: 1.25, cachedInputPricePerM: 0.125, outputPricePerM: 10, description: "Mô hình gpt-5 tiêu chuẩn" },
  { model: "gpt-5-mini", name: "gpt-5-mini", inputPricePerM: 0.25, cachedInputPricePerM: 0.025, outputPricePerM: 2, description: "Mô hình gpt-5 mini tiết kiệm chi phí" },
  { model: "gpt-5-nano", name: "gpt-5-nano", inputPricePerM: 0.05, cachedInputPricePerM: 0.005, outputPricePerM: 0.4, description: "Mô hình gpt-5 nano chi phí siêu rẻ" },
  { model: "gpt-5-pro", name: "gpt-5-pro", inputPricePerM: 15, cachedInputPricePerM: 0, outputPricePerM: 120, description: "Mô hình gpt-5 pro cao cấp" },
  { model: "gpt-4.1", name: "gpt-4.1", inputPricePerM: 2, cachedInputPricePerM: 0.5, outputPricePerM: 8, description: "Mô hình gpt-4.1 tiêu chuẩn" },
  { model: "gpt-4.1-mini", name: "gpt-4.1-mini", inputPricePerM: 0.4, cachedInputPricePerM: 0.1, outputPricePerM: 1.6, description: "Mô hình gpt-4.1 mini" },
  { model: "gpt-4.1-nano", name: "gpt-4.1-nano", inputPricePerM: 0.1, cachedInputPricePerM: 0.025, outputPricePerM: 0.4, description: "Mô hình gpt-4.1 nano" },
  { model: "gpt-4o", name: "gpt-4o", inputPricePerM: 2.5, cachedInputPricePerM: 1.25, outputPricePerM: 10, description: "Model đa phương tiện tiêu chuẩn 10/10" },
  { model: "gpt-4o-2024-05-13", name: "gpt-4o-2024-05-13", inputPricePerM: 5, cachedInputPricePerM: 0, outputPricePerM: 15, description: "Bản gpt-4o 2024-05-13" },
  { model: "gpt-4o-mini", name: "gpt-4o-mini", inputPricePerM: 0.15, cachedInputPricePerM: 0.075, outputPricePerM: 0.6, description: "Tốc độ siêu nhanh, chi phí siêu rẻ (Khuyên dùng)" },
  // { model: "o1", name: "o1", inputPricePerM: 15, cachedInputPricePerM: 7.5, outputPricePerM: 60, description: "Model suy luận lý trí o1" },
  // { model: "o1-pro", name: "o1-pro", inputPricePerM: 150, cachedInputPricePerM: 0, outputPricePerM: 600, description: "Model suy luận o1 pro cao cấp" },
  // { model: "o3-pro", name: "o3-pro", inputPricePerM: 20, cachedInputPricePerM: 0, outputPricePerM: 80, description: "Model suy luận o3 pro" },
  // { model: "o3", name: "o3", inputPricePerM: 2, cachedInputPricePerM: 0.5, outputPricePerM: 8, description: "Model suy luận o3 tiêu chuẩn" },
  // { model: "o4-mini", name: "o4-mini", inputPricePerM: 1.1, cachedInputPricePerM: 0.275, outputPricePerM: 4.4, description: "Model suy luận o4-mini" },
  // { model: "o3-mini", name: "o3-mini", inputPricePerM: 1.1, cachedInputPricePerM: 0.55, outputPricePerM: 4.4, description: "Model suy luận o3-mini" },
  // { model: "o1-mini", name: "o1-mini", inputPricePerM: 1.1, cachedInputPricePerM: 0.55, outputPricePerM: 4.4, description: "Model suy luận o1-mini" },
  // { model: "gpt-4-turbo-2024-04-09", name: "gpt-4-turbo-2024-04-09", inputPricePerM: 10, cachedInputPricePerM: 0, outputPricePerM: 30, description: "Mô hình GPT-4 Turbo" },
  // { model: "gpt-4-0125-preview", name: "gpt-4-0125-preview", inputPricePerM: 10, cachedInputPricePerM: 0, outputPricePerM: 30, description: "Mô hình GPT-4 0125 Preview" },
  // { model: "gpt-4-1106-preview", name: "gpt-4-1106-preview", inputPricePerM: 10, cachedInputPricePerM: 0, outputPricePerM: 30, description: "Mô hình GPT-4 1106 Preview" },
  // { model: "gpt-4-1106-vision-preview", name: "gpt-4-1106-vision-preview", inputPricePerM: 10, cachedInputPricePerM: 0, outputPricePerM: 30, description: "Mô hình GPT-4 Vision Preview" },
  // { model: "gpt-4-0613", name: "gpt-4-0613", inputPricePerM: 30, cachedInputPricePerM: 0, outputPricePerM: 60, description: "Mô hình GPT-4 0613" },
  // { model: "gpt-4-0314", name: "gpt-4-0314", inputPricePerM: 30, cachedInputPricePerM: 0, outputPricePerM: 60, description: "Mô hình GPT-4 0314" },
  // { model: "gpt-4-32k", name: "gpt-4-32k", inputPricePerM: 60, cachedInputPricePerM: 0, outputPricePerM: 120, description: "Mô hình GPT-4 32k" },
  // { model: "gpt-3.5-turbo", name: "gpt-3.5-turbo", inputPricePerM: 0.5, cachedInputPricePerM: 0, outputPricePerM: 1.5, description: "Mô hình GPT-3.5 Turbo" },
  // { model: "gpt-3.5-turbo-0125", name: "gpt-3.5-turbo-0125", inputPricePerM: 0.5, cachedInputPricePerM: 0, outputPricePerM: 1.5, description: "Mô hình GPT-3.5 Turbo 0125" },
  // { model: "gpt-3.5-turbo-1106", name: "gpt-3.5-turbo-1106", inputPricePerM: 1, cachedInputPricePerM: 0, outputPricePerM: 2, description: "Mô hình GPT-3.5 Turbo 1106" },
  // { model: "gpt-3.5-turbo-0613", name: "gpt-3.5-turbo-0613", inputPricePerM: 1.5, cachedInputPricePerM: 0, outputPricePerM: 2, description: "Mô hình GPT-3.5 Turbo 0613" },
  // { model: "gpt-3.5-0301", name: "gpt-3.5-0301", inputPricePerM: 1.5, cachedInputPricePerM: 0, outputPricePerM: 2, description: "Mô hình GPT-3.5 0301" },
  // { model: "gpt-3.5-turbo-instruct", name: "gpt-3.5-turbo-instruct", inputPricePerM: 1.5, cachedInputPricePerM: 0, outputPricePerM: 2, description: "Mô hình GPT-3.5 Turbo Instruct" },
  // { model: "gpt-3.5-turbo-16k-0613", name: "gpt-3.5-turbo-16k-0613", inputPricePerM: 3, cachedInputPricePerM: 0, outputPricePerM: 4, description: "Mô hình GPT-3.5 Turbo 16k" },
  // { model: "davinci-002", name: "davinci-002", inputPricePerM: 2, cachedInputPricePerM: 0, outputPricePerM: 2, description: "Mô hình Davinci 002" },
  // { model: "babbage-002", name: "babbage-002", inputPricePerM: 0.4, cachedInputPricePerM: 0, outputPricePerM: 0.4, description: "Mô hình Babbage 002" },
];
