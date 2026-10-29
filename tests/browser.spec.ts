import { test, expect } from '@playwright/test';

test('search, evidence, scoped sections, bookmark persistence and export',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByRole('heading',{name:/发现课程/})).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'/tmp/course-atlas-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'全部课程',exact:false}).first().click();
  await page.getByLabel('搜索课程、课号或教师').fill('CSCI 4220');
  await expect(page.getByText('证据存在冲突',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'查看 CSCI-4220 依据'}).click();
  const sheet=page.getByRole('dialog');await expect(sheet.getByText('Mid-Term Exam: 20%',{exact:false})).toBeVisible();
  await page.screenshot({path:'/tmp/course-atlas-detail.png',animations:'disabled'});
  await expect(sheet.getByText('no exams, just in-class quizzes',{exact:false})).toBeVisible();
  await sheet.getByRole('button',{name:'收藏课程',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.reload();await expect(page.getByRole('button',{name:'取消收藏 CSCI-4220'})).toBeVisible();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出结果'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/\.csv$/);
  await page.getByLabel('搜索课程、课号或教师').fill('INQR 1200');await page.getByRole('button',{name:'查看 INQR-1200 依据'}).click();
  await expect(sheet.getByText('回复没有逐字保证全部考试在线',{exact:false})).toBeVisible();
  await page.keyboard.press('Escape');expect(errors).toEqual([]);
});

test('all courses, unknowns, pagination, direct link and empty states',async({page})=>{
  await page.goto('/?status=all&view=all');await expect(page.getByText('第 1 / 51 页')).toBeVisible();
  await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.getByText('第 2 / 51 页')).toBeVisible();
  await page.getByLabel('搜索课程、课号或教师').fill('CSCI 4964');await expect(page.getByRole('region',{name:'课程浏览器'}).getByText('考试形式未知',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'查看 CSCI-4964 依据'}).click();await expect(page.getByRole('dialog').getByText('尚未人工确认可归属的考核结论',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await page.getByLabel('搜索课程、课号或教师').fill('no-such-course-abcdef');await expect(page.getByText('没有匹配的课程',{exact:true})).toBeVisible();
  await page.goto('/?course=CHEM-4810');await expect(page.getByRole('dialog').getByText('CHEM-4810',{exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'我的收藏',exact:false}).click();await expect(page.getByText('把感兴趣的课程留下来')).toBeVisible();
});

test('assessment support stays behind the page and quiz warnings remain',async({page})=>{
  await page.goto('/?status=all&view=all&q=ECSE+4770&quizzes=hide');
  await expect(page.getByRole('switch')).toHaveCount(0);
  await expect(page).not.toHaveURL(/quizzes=/);
  await expect(page.locator('#archive')).toHaveCount(0);
  await page.getByRole('button',{name:'查看 ECSE-4770 依据'}).click();
  const sheet=page.getByRole('dialog');
  await expect(sheet.getByText(/^Fall 2025 大纲明确无考试，但评分表另列 Quizzes 15%/)).toBeVisible();
  await expect(sheet.getByRole('heading',{name:'历史大纲核查'})).toHaveCount(0);
  await expect(sheet.getByText('仓库归档定位',{exact:true})).toHaveCount(0);
  await expect(sheet.getByText('历史校内班',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/?status=all&view=all&q=MANE+4640');
  await expect(page.getByRole('region',{name:'课程浏览器'}).getByText('按教师 / 班次区分',{exact:true})).toBeVisible();
});

test('mobile layout, source chart and methodology are usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await expect(page.getByRole('heading',{name:/发现课程/})).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'/tmp/course-atlas-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('搜索课程、课号或教师').fill('CHEM 4810');
  await page.getByRole('button',{name:'查看 CHEM-4810 依据'}).click();await expect(page.getByRole('dialog').getByText('CHEM-4810',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'证据与来源',exact:false}).click();await expect(page.getByRole('img',{name:/大纲/})).toBeVisible();
  await expect(page.getByRole('heading',{name:'为什么这些课程没被收进来？'})).toBeVisible();
  await page.getByRole('button',{name:'研究方法',exact:true}).click();await expect(page.getByRole('dialog').getByText('依据透明，选择才有底气。')).toBeVisible();
});

test('program scope, RMP evidence and coverage are visible',async({page})=>{
  await page.goto('/?q=MGMT+4100');
  await page.getByRole('button',{name:'查看 MGMT-4100 依据'}).click();
  await expect(page.getByRole('dialog').getByRole('link',{name:/Rate My Professors · Hakan/})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/?q=MANE+5000&program=atwork&status=all');
  await expect(page.getByRole('region',{name:'课程浏览器'}).getByText('证据存在冲突',{exact:true})).toBeVisible();
  await page.getByLabel('班次范围').selectOption('campus');
  await expect(page.getByRole('region',{name:'课程浏览器'}).getByText('考试形式未知',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'检索覆盖',exact:false}).click();
  await expect(page.getByRole('heading',{name:'还有哪些课需要继续查？'})).toBeVisible();
  await expect(page.getByRole('img',{name:/有依据/})).toBeVisible();
  await page.goto('/?status=all&q=ARCH+2530');
  await page.getByRole('button',{name:'查看 ARCH-2530 依据'}).click();
  const log=page.getByRole('dialog').getByText(/查看已执行的检索/);
  await expect(log).toBeVisible();await log.click();
  await expect(page.getByRole('dialog').getByText('Rensselaer "ARCH 2530" syllabus grading exams',{exact:true})).toBeVisible();
  await expect(page.getByRole('dialog').getByText(/未从查询本身推断考试形式/)).toBeVisible();
});
