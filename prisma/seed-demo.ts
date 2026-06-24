import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data...");

  // ─── Ensure employee Bùi Ngọc Anh exists ───
  const empPassword = await hash("ligon2024", 12);
  const bna = await prisma.user.upsert({
    where: { email: "bna@ligonteam.com" },
    update: {},
    create: {
      email: "bna@ligonteam.com",
      passwordHash: empPassword,
      fullName: "Bùi Ngọc Anh",
      nameAbbreviation: "BNA",
      role: "employee",
      status: "active",
    },
  });
  console.log(`✅ Employee: ${bna.fullName} (${bna.email})`);

  // Another employee
  const ptl = await prisma.user.upsert({
    where: { email: "ptl@ligonteam.com" },
    update: {},
    create: {
      email: "ptl@ligonteam.com",
      passwordHash: empPassword,
      fullName: "Phạm Thuỳ Linh",
      nameAbbreviation: "PTL",
      role: "employee",
      status: "active",
    },
  });
  console.log(`✅ Employee: ${ptl.fullName}`);

  // ─── Ensure topics exist ───
  const topicNames = [
    "Back To School",
    "Baby Announcement Sign",
    "Baby Milestone Sign",
    "Christmas Ornament",
    "Wedding Sign",
    "Pet Memorial",
    "Home Decor",
    "Mother Day",
    "Father Day",
  ];
  const topicMap: Record<string, string> = {};
  for (const name of topicNames) {
    const t = await prisma.productTopic.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    topicMap[name] = t.id;
  }
  console.log(`✅ ${topicNames.length} topics`);

  // ─── Ensure AI models exist ───
  const modelNames = [
    "🍌 Nano Banana",
    "Midjourney V6",
    "DALL-E 3",
    "Stable Diffusion XL",
    "Flux Pro",
    "Leonardo AI",
  ];
  const modelMap: Record<string, string> = {};
  for (const name of modelNames) {
    const m = await prisma.aiModel.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    modelMap[name] = m.id;
  }
  console.log(`✅ ${modelNames.length} AI models`);

  // ─── Get boss and manager ───
  const boss = await prisma.user.findFirst({ where: { role: "boss" } });
  const manager = await prisma.user.findFirst({ where: { role: "manager" } });
  if (!boss || !manager) {
    console.error("❌ Boss or manager not found. Run base seed first.");
    return;
  }

  // ─── Get selling accounts ───
  let amzAccount = await prisma.sellingAccount.findFirst({ where: { platform: "amazon" } });
  let etsyAccount = await prisma.sellingAccount.findFirst({ where: { platform: "etsy" } });
  if (!amzAccount) {
    amzAccount = await prisma.sellingAccount.create({
      data: { platform: "amazon", name: "Ligon Amazon Main", status: "active", createdById: boss.id },
    });
  }
  if (!etsyAccount) {
    etsyAccount = await prisma.sellingAccount.create({
      data: { platform: "etsy", name: "Ligon Etsy Store", status: "active", createdById: boss.id },
    });
  }

  // ─── IDEA 1: Back To School Dinosaur (from user's real data) ───
  const idea1 = await prisma.idea.create({
    data: {
      sku: "BNA2603-33",
      msku: "BNA2603-33",
      autoGenerateMsku: false,
      createdById: bna.id,
      topicId: topicMap["Back To School"],
      aiModelId: modelMap["🍌 Nano Banana"],
      prompt: `Realistic studio product photo of a personalized wooden kids school milestone board in a cute dinosaur theme. The board is shaped like a friendly dinosaur with layered laser-cut plywood details. The design includes reusable magnetic pieces for age, grade, and favorite subject. A small photo slot allows parents to place a picture of their child. Playful engraved icons such as tiny dinosaurs, leaves, and stars decorate the board. Natural wood texture with soft pastel green accents. Front-facing studio product photography, clean background, soft shadow, high detail wood texture, 1024x1024.`,
      sourceLinks: JSON.stringify(["https://www.etsy.com/listing/1737753584"]),
      mainImageUrl: "https://drive.google.com/file/d/1Ek_Xhla6Zy9DIf6UYos4KDm45oY32y6P/view?usp=drive_link",
      status: "approved",
      photoStatus: "pending_approval",
      fulfillmentType: "FBM",
      source: "employee",
      title: "Personalized Wooden Dinosaur Back To School Sign, First Day Journey Board with Photo Frame, Engraved Milestone Keepsake for Kindergarten Grade 1 Kids, Natural Plywood Nursery Decor Gift",
      description: "Celebrate your child's educational milestones with our exquisitely crafted Personalized Wooden Dinosaur School Journey Board. Made from premium, sustainably sourced plywood, this charming brontosaurus-shaped sign captures the magic of the first day of school.",
      createdAt: new Date("2026-03-09"),
    },
  });

  await prisma.amazonListing.create({
    data: {
      ideaId: idea1.id,
      sellingAccountId: amzAccount.id,
      itemName: "Personalized Wooden Dinosaur Back To School Sign, First Day Journey Board with Photo Frame",
      bulletPoints: JSON.stringify([
        "Personalization Options: Document your child's academic progress with engraved fields including name, age, grade, favorite subject, and future career goals to create a unique memory for every year",
        "Premium Wood Construction: Expertly crafted from high quality natural plywood featuring smooth laser cut edges and durable construction that resists warping while providing a rustic nursery aesthetic",
        "Built In Photo Frame: Showcase a three inch by four inch portrait of your student within the integrated frame cutout designed to highlight their first day of school appearance throughout the years",
        "Whimsical Dinosaur Theme: Featuring a friendly green long neck dinosaur silhouette with intricate engraving and pastel leaf accents that appeal to young boys and girls who love prehistoric animals",
        "Perfect Keepsake Gift: Ideal for parents and teachers seeking a meaningful way to celebrate educational milestones from preschool through elementary school while serving as charming wall decor items",
      ]),
      description: "Celebrate your child's educational milestones with our exquisitely crafted Personalized Wooden Dinosaur School Journey Board.",
      tags: "personalized school sign;wooden dinosaur board;first day of school photo prop;kindergarten milestone plaque;toddler nursery decor;childrens gift ideas;elementary classroom supplies;custom name plate;engraved wooden toy",
      slugs: "personalized-dinosaur-school-journey-board\nwooden-back-to-school-photo-prop\nengraved-milestone-sign-for-boys\nnatural-wood-nursery-wall-decor",
      price: 29.99,
      galleryImages: JSON.stringify([
        "https://drive.google.com/file/d/1eudwVYZJlFY2XyMUpOqo0PqhIO8Nfh3L/view?usp=drive_link",
        "https://drive.google.com/file/d/1_T96BfsaZaLBPB9Ne2RwOWoYuh7miYJe/view?usp=drive_link",
        "https://drive.google.com/file/d/1WreF3aSMbuVWdqnb1TfmLNqKTglWFsGL/view?usp=drive_link",
        "https://drive.google.com/file/d/14TTK4GV9fTWcdYTQ8XSUWzOveH6oVkBA/view?usp=drive_link",
        "https://drive.google.com/file/d/1iG6VarrlSAkAWOW7gloWO5shYQ89Aq_7/view?usp=drive_link",
        "https://drive.google.com/file/d/1L_NvPpwuveU_wKCkxllhPnEmcJY7YCFa/view?usp=drive_link",
        "https://drive.google.com/file/d/13f8YbuVTmL72a7ZMwkiwUHjuGU9eEqKv/view?usp=drive_link",
        "https://drive.google.com/file/d/12wjWQaP3ngkOXLM98uul5MRVVVINsaTp/view?usp=drive_link",
        "https://drive.google.com/file/d/12DcTmLZf8ujAwVaxK8yH2JwQJZO-YmhF/view?usp=drive_link",
      ]),
      listingStatus: "ready",
    },
  });

  await prisma.etsyListing.create({
    data: {
      ideaId: idea1.id,
      sellingAccountId: etsyAccount.id,
      title: "Personalized Wooden Dinosaur Back To School Sign First Day Journey Board",
      tags: JSON.stringify(["school sign", "dinosaur board", "first day school", "milestone plaque", "nursery decor", "kids gift", "wooden sign", "kindergarten", "back to school", "personalized", "engraved", "photo prop", "keepsake"]),
      description: "Celebrate your child's educational milestones with our Personalized Wooden Dinosaur School Journey Board.",
      price: 29.99,
      useSharedGallery: true,
      useAmazonVideo: false,
      listingStatus: "ready",
    },
  });
  console.log(`✅ Idea 1: ${idea1.msku} - Back To School Dinosaur`);

  // ─── IDEA 2: Baby Milestone Sign ───
  const idea2 = await prisma.idea.create({
    data: {
      sku: "PTL2604-12",
      msku: "PTL2604-12",
      autoGenerateMsku: false,
      createdById: ptl.id,
      topicId: topicMap["Baby Milestone Sign"],
      aiModelId: modelMap["Midjourney V6"],
      prompt: "Realistic studio product photo of a personalized wooden baby monthly milestone board. Round shape with laser-engraved month markers 1-12. Features a removable heart-shaped pointer. Soft pastel colors with floral accents. Clean white background, soft shadow.",
      sourceLinks: JSON.stringify(["https://www.etsy.com/listing/1654321000", "https://www.amazon.com/dp/B0EXAMPLE1"]),
      mainImageUrl: "https://drive.google.com/file/d/1Ek_Xhla6Zy9DIf6UYos4KDm45oY32y6P/view?usp=drive_link",
      status: "published",
      photoStatus: "approved",
      fulfillmentType: "FBA",
      source: "employee",
      title: "Personalized Wooden Baby Monthly Milestone Board, Round Laser Engraved Month Tracker with Heart Pointer",
      description: "Track your baby's precious first year with our beautifully crafted wooden milestone board.",
      createdAt: new Date("2026-04-12"),
    },
  });

  await prisma.amazonListing.create({
    data: {
      ideaId: idea2.id,
      sellingAccountId: amzAccount.id,
      itemName: "Personalized Wooden Baby Monthly Milestone Board",
      bulletPoints: JSON.stringify([
        "Track Milestones: Beautiful round board with month markers 1-12 and a movable heart pointer for capturing monthly photos",
        "Premium Quality: Made from sustainably sourced birch plywood with precision laser engraving for clean edges",
        "Personalized Touch: Custom engraved with baby's name and birth date in elegant script font",
        "Photo Prop Ready: 12 inch diameter board is the perfect size for newborn to 12 month photo sessions",
        "Gift Ready: Arrives in a beautiful gift box, perfect for baby showers and gender reveal parties",
      ]),
      description: "Track your baby's precious first year with our wooden milestone board.",
      tags: "baby milestone board;monthly photo prop;newborn gift;baby shower gift;personalized baby;wooden nursery decor",
      price: 24.99,
      listingStatus: "selling",
    },
  });
  console.log(`✅ Idea 2: ${idea2.msku} - Baby Milestone`);

  // ─── IDEA 3: Christmas Ornament ───
  const idea3 = await prisma.idea.create({
    data: {
      sku: "BNA2605-07",
      msku: "BNA2605-07",
      autoGenerateMsku: false,
      createdById: bna.id,
      topicId: topicMap["Christmas Ornament"],
      aiModelId: modelMap["Flux Pro"],
      prompt: "Studio product photo of personalized wooden Christmas ornament set. Family name engraved on a star-shaped main ornament with smaller snowflake ornaments for each family member. Natural wood grain with red ribbon.",
      sourceLinks: JSON.stringify(["https://www.etsy.com/listing/1888888000"]),
      mainImageUrl: "https://drive.google.com/file/d/1Ek_Xhla6Zy9DIf6UYos4KDm45oY32y6P/view?usp=drive_link",
      status: "reviewing",
      photoStatus: "not_requested",
      fulfillmentType: "FBA",
      source: "employee",
      title: "Personalized Wooden Christmas Ornament Set, Family Name Star Ornament with Snowflake Name Tags",
      description: "Create lasting holiday memories with our handcrafted personalized Christmas ornament set.",
      createdAt: new Date("2026-05-07"),
    },
  });
  console.log(`✅ Idea 3: ${idea3.msku} - Christmas Ornament`);

  // ─── IDEA 4: Wedding Sign ───
  const idea4 = await prisma.idea.create({
    data: {
      sku: "PTL2605-18",
      msku: "PTL2605-18",
      autoGenerateMsku: false,
      createdById: ptl.id,
      topicId: topicMap["Wedding Sign"],
      aiModelId: modelMap["DALL-E 3"],
      prompt: "Elegant personalized wooden wedding welcome sign. Tall rectangular shape with bride and groom names, date, and floral laser-cut border. Natural walnut stain finish. Studio photography on neutral background.",
      sourceLinks: JSON.stringify(["https://www.etsy.com/listing/1555555000"]),
      mainImageUrl: "https://drive.google.com/file/d/1Ek_Xhla6Zy9DIf6UYos4KDm45oY32y6P/view?usp=drive_link",
      status: "approved",
      photoStatus: "approved",
      fulfillmentType: "FBM",
      source: "employee",
      title: "Personalized Wooden Wedding Welcome Sign, Rustic Ceremony Decor with Couple Names and Date",
      description: "Welcome your guests in style with our stunning personalized wooden wedding sign.",
      createdAt: new Date("2026-05-18"),
    },
  });

  await prisma.amazonListing.create({
    data: {
      ideaId: idea4.id,
      sellingAccountId: amzAccount.id,
      itemName: "Personalized Wooden Wedding Welcome Sign",
      bulletPoints: JSON.stringify([
        "Custom Engraving: Names, date, and message laser engraved with elegant calligraphy font",
        "Premium Walnut: Rich walnut-stained plywood with a warm, luxurious finish",
        "Versatile Size: 24 x 36 inch sign perfect for ceremony entrance or reception table",
        "Easy Setup: Includes a sturdy wooden easel stand for freestanding display",
        "Keepsake Quality: Beautiful enough to hang in your home after the wedding as a lasting memory",
      ]),
      description: "Welcome your guests in style with our stunning personalized wooden wedding sign.",
      tags: "wedding welcome sign;rustic wedding decor;personalized wedding;ceremony sign;reception decor;bridal shower",
      price: 49.99,
      listingStatus: "ready",
    },
  });
  console.log(`✅ Idea 4: ${idea4.msku} - Wedding Sign`);

  // ─── IDEA 5: Mother Day ───
  const idea5 = await prisma.idea.create({
    data: {
      sku: "BNA2606-01",
      msku: "BNA2606-01",
      autoGenerateMsku: false,
      createdById: bna.id,
      topicId: topicMap["Mother Day"],
      aiModelId: modelMap["Leonardo AI"],
      prompt: "Studio photo of personalized mother's day wooden photo frame. Heart-shaped cutout with 'Mom' engraved. Holds 4x6 photo. Floral engraving border. Natural wood with pink accent paint.",
      sourceLinks: JSON.stringify(["https://www.etsy.com/listing/1666666000"]),
      mainImageUrl: "https://drive.google.com/file/d/1Ek_Xhla6Zy9DIf6UYos4KDm45oY32y6P/view?usp=drive_link",
      status: "approved",
      photoStatus: "awaiting_photos",
      photoAssigneeId: ptl.id,
      fulfillmentType: "FBM",
      source: "employee",
      title: "Personalized Mother Day Wooden Photo Frame, Heart Shape Mom Gift with Floral Engraving",
      description: "Show mom how much she means with our heartfelt personalized photo frame.",
      createdAt: new Date("2026-06-01"),
    },
  });
  console.log(`✅ Idea 5: ${idea5.msku} - Mother Day Frame`);

  // ─── IDEA 6: Pet Memorial ───
  const idea6 = await prisma.idea.create({
    data: {
      sku: "PTL2606-10",
      msku: "PTL2606-10",
      autoGenerateMsku: false,
      createdById: ptl.id,
      topicId: topicMap["Pet Memorial"],
      aiModelId: modelMap["Stable Diffusion XL"],
      prompt: "Product photo of personalized pet memorial wooden plaque. Paw print shape with pet name, dates, and 'Forever in our hearts' engraved. Small photo insert. Natural maple wood.",
      sourceLinks: JSON.stringify(["https://www.amazon.com/dp/B0PETMEM01"]),
      mainImageUrl: "https://drive.google.com/file/d/1Ek_Xhla6Zy9DIf6UYos4KDm45oY32y6P/view?usp=drive_link",
      status: "reviewing",
      photoStatus: "not_requested",
      fulfillmentType: "FBM",
      source: "employee",
      title: "Personalized Pet Memorial Wooden Plaque, Paw Print Shape with Photo Insert and Custom Engraving",
      description: "Honor your beloved companion with our touching personalized pet memorial plaque.",
      createdAt: new Date("2026-06-10"),
    },
  });
  console.log(`✅ Idea 6: ${idea6.msku} - Pet Memorial`);

  // ─── PRODUCTION REQUESTS ───
  // Production for Baby Milestone (FBA - needs production)
  const prod1 = await prisma.productionRequest.create({
    data: {
      ideaId: idea2.id,
      type: "batch",
      priority: "priority",
      requestedQty: 50,
      noteForWorkers: "Batch đầu tiên cho FBA. Cắt gỗ birch 3mm, khắc laser 2 mặt.",
      createdAt: new Date("2026-04-20"),
      steps: {
        create: [
          { stepName: "Cắt gỗ", sequenceOrder: 1, performedBy: "Anh Tuấn", startedAt: new Date("2026-04-21"), finishedAt: new Date("2026-04-22") },
          { stepName: "Khắc laser", sequenceOrder: 2, performedBy: "Chị Linh", startedAt: new Date("2026-04-23"), finishedAt: new Date("2026-04-24") },
          { stepName: "Sơn màu", sequenceOrder: 3, performedBy: "Anh Đức", startedAt: new Date("2026-04-25"), finishedAt: new Date("2026-04-26") },
          { stepName: "Đóng gói", sequenceOrder: 4, performedBy: "Chị Hoa", startedAt: new Date("2026-04-27"), finishedAt: new Date("2026-04-28") },
        ],
      },
    },
  });
  // Mark as completed
  await prisma.productionRequest.update({
    where: { id: prod1.id },
    data: { completedAt: new Date("2026-04-28"), actualQty: 48 },
  });
  console.log("✅ Production 1: Baby Milestone batch (completed)");

  // Production for Christmas Ornament
  const prod2 = await prisma.productionRequest.create({
    data: {
      ideaId: idea3.id,
      type: "sample",
      priority: "normal",
      requestedQty: 5,
      noteForWorkers: "Mẫu thử trước khi sản xuất hàng loạt. Thử 2 loại gỗ: birch và maple.",
      createdAt: new Date("2026-05-15"),
      steps: {
        create: [
          { stepName: "Cắt gỗ", sequenceOrder: 1, performedBy: "Anh Tuấn", startedAt: new Date("2026-05-16") },
          { stepName: "Khắc laser", sequenceOrder: 2 },
          { stepName: "Sơn & hoàn thiện", sequenceOrder: 3 },
        ],
      },
    },
  });
  console.log("✅ Production 2: Christmas Ornament sample (in progress)");

  // Production for Wedding Sign
  await prisma.productionRequest.create({
    data: {
      ideaId: idea4.id,
      type: "batch",
      priority: "urgent",
      requestedQty: 20,
      noteForWorkers: "Khẩn cấp! Có đơn đặt trước 15 cái. Cắt walnut 5mm.",
      createdAt: new Date("2026-06-01"),
      steps: {
        create: [
          { stepName: "Cắt gỗ walnut", sequenceOrder: 1 },
          { stepName: "Khắc laser", sequenceOrder: 2 },
          { stepName: "Nhuộm & phủ bóng", sequenceOrder: 3 },
          { stepName: "Đóng gói + easel", sequenceOrder: 4 },
        ],
      },
    },
  });
  console.log("✅ Production 3: Wedding Sign batch (pending)");

  // ─── ORDERS ───
  const orders = [
    {
      platform: "amazon",
      orderId: "114-3948576-2948371",
      orderDate: new Date("2026-06-15"),
      customerName: "Sarah Johnson",
      addressLine1: "123 Oak Street",
      city: "Portland",
      state: "OR",
      zipcode: "97201",
      country: "US",
      sku: "PTL2604-12",
      quantity: 2,
      unitPrice: 24.99,
      sellingAccountId: amzAccount.id,
      productionStatus: "fulfilled",
      customNote: "Khắc tên: Baby Emma, DOB: Jan 15 2026",
      trackingNumber: "1Z999AA10123456784",
      trackingUploaded: true,
      designerId: ptl.id,
      producerId: bna.id,
      createdAt: new Date("2026-06-15"),
    },
    {
      platform: "amazon",
      orderId: "114-7291038-5572910",
      orderDate: new Date("2026-06-18"),
      customerName: "Michael Chen",
      addressLine1: "456 Maple Ave Apt 2B",
      city: "Seattle",
      state: "WA",
      zipcode: "98101",
      country: "US",
      sku: "PTL2605-18",
      quantity: 1,
      unitPrice: 49.99,
      sellingAccountId: amzAccount.id,
      productionStatus: "producing",
      customNote: "Names: Michael & Jessica, Date: Sep 20 2026",
      designerId: bna.id,
      createdAt: new Date("2026-06-18"),
    },
    {
      platform: "etsy",
      orderId: "3847291056",
      orderDate: new Date("2026-06-19"),
      customerName: "Emily Davis",
      addressLine1: "789 Pine Road",
      city: "Austin",
      state: "TX",
      zipcode: "78701",
      country: "US",
      sku: "BNA2603-33",
      quantity: 1,
      unitPrice: 29.99,
      sellingAccountId: etsyAccount.id,
      productionStatus: "producing",
      customNote: "Name: Liam, Grade: 1st, Age: 6",
      createdAt: new Date("2026-06-19"),
    },
    {
      platform: "amazon",
      orderId: "114-5829174-9918273",
      orderDate: new Date("2026-06-20"),
      customerName: "Amanda Wilson",
      addressLine1: "321 Elm Boulevard",
      city: "Denver",
      state: "CO",
      zipcode: "80201",
      country: "US",
      sku: "PTL2604-12",
      quantity: 1,
      unitPrice: 24.99,
      sellingAccountId: amzAccount.id,
      productionStatus: "produced",
      customNote: "Baby Noah, born March 2026",
      trackingNumber: "1Z999AA10987654321",
      designerId: ptl.id,
      producerId: bna.id,
      createdAt: new Date("2026-06-20"),
    },
    {
      platform: "etsy",
      orderId: "3851029384",
      orderDate: new Date("2026-06-21"),
      customerName: "Jennifer Martinez",
      addressLine1: "654 Birch Lane",
      city: "Miami",
      state: "FL",
      zipcode: "33101",
      country: "US",
      sku: "BNA2606-01",
      quantity: 1,
      unitPrice: 34.99,
      sellingAccountId: etsyAccount.id,
      productionStatus: "producing",
      customNote: "Mom's name: Maria, Kids: Sofia & Diego",
      createdAt: new Date("2026-06-21"),
    },
    {
      platform: "amazon",
      orderId: "114-9182736-4455667",
      orderDate: new Date("2026-06-22"),
      customerName: "Robert Thompson",
      addressLine1: "987 Cedar Court",
      city: "Chicago",
      state: "IL",
      zipcode: "60601",
      country: "US",
      sku: "PTL2605-18",
      quantity: 1,
      unitPrice: 49.99,
      sellingAccountId: amzAccount.id,
      productionStatus: "producing",
      customNote: "Names: Robert & Lisa, Date: Oct 5 2026, Venue: Garden Rose Estate",
      createdAt: new Date("2026-06-22"),
    },
  ];

  for (const order of orders) {
    await prisma.order.create({ data: order });
  }
  console.log(`✅ ${orders.length} orders created`);

  // ─── NOTIFICATIONS ───
  const notifications = [
    {
      userId: bna.id,
      type: "photo_assigned",
      category: "photo",
      message: "Bạn được giao làm ảnh cho ý tưởng BNA2603-33 (Back To School Dinosaur)",
      actionUrl: `/ideas/${idea1.id}`,
      priority: "priority",
      createdAt: new Date("2026-06-18"),
    },
    {
      userId: ptl.id,
      type: "revision_requested",
      category: "photo",
      message: "Ảnh ý tưởng PTL2604-12 cần chỉnh sửa: Cần thêm ảnh lifestyle với em bé",
      actionUrl: `/ideas/${idea2.id}`,
      priority: "urgent",
      createdAt: new Date("2026-06-19"),
    },
    {
      userId: bna.id,
      type: "production_assigned",
      category: "production_file",
      message: "Yêu cầu sản xuất mới: 20 Wedding Sign (Khẩn cấp)",
      actionUrl: "/production",
      priority: "urgent",
      createdAt: new Date("2026-06-20"),
    },
    {
      userId: manager.id,
      type: "idea_submitted",
      category: "general",
      message: "Bùi Ngọc Anh đã gửi ý tưởng mới: Pet Memorial Wooden Plaque",
      actionUrl: `/ideas/${idea6.id}`,
      priority: "normal",
      createdAt: new Date("2026-06-20"),
    },
    {
      userId: boss.id,
      type: "idea_submitted",
      category: "general",
      message: "Phạm Thuỳ Linh đã gửi ý tưởng mới: Pet Memorial Wooden Plaque",
      actionUrl: `/ideas/${idea6.id}`,
      priority: "normal",
      createdAt: new Date("2026-06-20"),
    },
    {
      userId: bna.id,
      type: "order_new",
      category: "processing_file",
      message: "Đơn hàng mới từ Etsy: #3847291056 - Back To School Dinosaur x1",
      actionUrl: "/orders",
      priority: "priority",
      isRead: true,
      createdAt: new Date("2026-06-19"),
    },
    {
      userId: ptl.id,
      type: "order_new",
      category: "processing_file",
      message: "Đơn hàng mới từ Amazon: #114-7291038-5572910 - Wedding Sign x1",
      actionUrl: "/orders",
      priority: "normal",
      createdAt: new Date("2026-06-18"),
    },
    {
      userId: boss.id,
      type: "production_completed",
      category: "general",
      message: "Hoàn thành sản xuất batch Baby Milestone Sign (48/50 sản phẩm)",
      actionUrl: "/production",
      priority: "normal",
      isRead: true,
      isCompleted: true,
      createdAt: new Date("2026-04-28"),
    },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({ data: notif });
  }
  console.log(`✅ ${notifications.length} notifications created`);

  // ─── SHIPMENT BOX (for FBA Baby Milestone) ───
  await prisma.shipmentBox.create({
    data: {
      shipDate: new Date("2026-05-05"),
      amazonAccountId: amzAccount.id,
      shipmentId: "FBA18GH2K9P",
      boxName: "Box A-1",
      warehouseCode: "PHX7",
      shipLine: "Air VNL",
      lengthCm: 45,
      widthCm: 35,
      heightCm: 25,
      weightKg: 8.5,
      trackingNumber: "VNL-2026050501",
      items: {
        create: [
          { ideaId: idea2.id, qtyPerBox: 24, totalBoxCount: 2 },
        ],
      },
    },
  });

  await prisma.shipmentBox.create({
    data: {
      shipDate: new Date("2026-05-05"),
      amazonAccountId: amzAccount.id,
      shipmentId: "FBA18GH2K9P",
      boxName: "Box A-2",
      warehouseCode: "PHX7",
      shipLine: "Air VNL",
      lengthCm: 45,
      widthCm: 35,
      heightCm: 25,
      weightKg: 8.2,
      trackingNumber: "VNL-2026050502",
      items: {
        create: [
          { ideaId: idea2.id, qtyPerBox: 24, totalBoxCount: 2 },
        ],
      },
    },
  });
  console.log("✅ 2 shipment boxes created (FBA Baby Milestone)");

  console.log("\n🎉 Demo data seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
