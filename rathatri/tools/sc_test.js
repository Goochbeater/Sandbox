module.exports = async (H) => {
  await H.page.waitForFunction(() => typeof MG !== 'undefined' && MG.testResult, { timeout: 600000 });
  console.log(await H.eval(() => TEST.results.join('\n')));
  console.log('RESULT', await H.eval(() => MG.testResult));
};
