async function main() {
    console.log("Calendar data is now stored in F1Calendar2026.json.");
    console.log("No Prisma seed step is required for meetings or sessions.");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
