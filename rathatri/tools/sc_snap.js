// Scenario: boot into a level (via ?play=<id>&nointro), step N frames, screenshot. env: FRAMES (default 120) NAME (default snap)
module.exports = async (H) => {
  await H.step(+(process.env.FRAMES || 120), 1 / 30);
  await H.pshot(process.env.NAME || 'snap');
};
