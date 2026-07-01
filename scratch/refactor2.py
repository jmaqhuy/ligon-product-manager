import re

with open('src/app/(dashboard)/ideas/new/page.tsx', 'r') as f:
    content = f.read()

newOnSubmit = """  const onSubmit = async (values: any) => {
    // Translation Layer: UI Units -> DB Units
    let dbWidthCm: number | undefined = undefined;
    let dbHeightCm: number | undefined = undefined;
    let dbThicknessMm: number | undefined = undefined;

    if (values.width && !isNaN(parseFloat(values.width))) {
      dbWidthCm = useMetrics ? parseFloat(values.width) / 10 : parseFloat(values.width) * 2.54;
    }
    if (values.height && !isNaN(parseFloat(values.height))) {
      dbHeightCm = useMetrics ? parseFloat(values.height) / 10 : parseFloat(values.height) * 2.54;
    }
    if (values.thickness && !isNaN(parseFloat(values.thickness))) {
      dbThicknessMm = useMetrics ? parseFloat(values.thickness) : parseFloat(values.thickness) * 25.4;
    }

    setLoading(true);
    const apiPayload = { ...values, widthCm: dbWidthCm, heightCm: dbHeightCm, thicknessMm: dbThicknessMm };

    const { data } = await apiFetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiPayload),
      successMessage: "Tạo ý tưởng thành công",
    });

    if (data) {
      await apiFetch("/api/ideas/draft", { method: "DELETE" });
      form.reset();
      setShowDraftBanner(false);
      setLastSaved(null);
      import("canvas-confetti").then((confetti) => {
        confetti.default({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      });
      setTimeout(() => router.push("/ideas"), 2000);
    }
    setLoading(false);
  };"""
content = re.sub(r'  const onSubmit = async \(values: any\) => \{[\s\S]*?setLoading\(false\);\n  \};', newOnSubmit, content)

with open('src/app/(dashboard)/ideas/new/page.tsx', 'w') as f:
    f.write(content)
