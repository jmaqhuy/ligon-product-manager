import re

with open('src/app/(dashboard)/ideas/new/page.tsx', 'r') as f:
    content = f.read()

# Fix SourceLinksField
sourceLinksField = """function SourceLinksField({ control }: { control: any }) {
  const sourceLinks = useWatch({ control, name: "sourceLinks" }) || [""];
  const { setValue } = useFormContext(); // We need setValue, but wait, control doesn't provide setValue directly. We should pass form.setValue as a prop, or use useFormContext.
  // Actually, we can just pass `form` as a prop or `setValue`. Let's assume we pass `form` instead of `control`.
"""
# Wait, I'll just replace the components entirely.
