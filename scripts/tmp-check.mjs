(async ()=>{
  const m = await import('markdownlint/sync');
  console.log('keys', Object.keys(m));
  console.log('hasDefault', !!m.default);
  if (m.default) console.log('defaultKeys', Object.keys(m.default));
})();
