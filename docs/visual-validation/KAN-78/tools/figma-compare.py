from PIL import Image, ImageChops, ImageDraw, ImageOps
import os, json
F='/workspace/kan78/repos/padelcheck-fe/docs/visual-validation/KAN-78/figma/'
pairs=[('a1-04-step4-combinado-6ta-6ta','3088-32245_step4-combinado-incomplete'),('a7-01-suma-17-invalid','3088-32497_step4-suma-invalid'),
('a1-06-step5','3088-32724_step5-with'),('a1-07-step6-one','3088-33532_step6-one'),('a1-09-step6-two-limit','3088-33626_step6-multi'),
('a6-08-back-during-creating','3088-33952_step6-creating'),('a2-01-lost-response-error','3088-34054_step6-error'),('a1-11-success','3090-33794_success'),
('a1-13-hub-categorias','3089-32762_hub-multi'),('a5-06-hub-short','3089-33033_hub-one'),('a5-01-hub-all-cancelled','3089-33229_hub-empty'),
('a5-04-ptr-error-keeps-data','3089-33580_hub-error'),('a3-01-hub-limit-admin','2309-9285_limit-hub'),('a3-02-step4-simple-batch-over-limit','2309-9274_limit-step4'),
('a4-01-edit','3088-33060_edit'),('a4-04-saved','3089-33758_hub-edit-saved'),('a4-07-cancel-dialog','3089-33014_cancel-confirm'),
('a4-08-cancel-busy','3089-34272_cancel-busy'),('a4-09-cancelled','3089-33962_hub-cancelled')]
os.makedirs('compare',exist_ok=True); out=[]
for a,f in pairs:
    an=Image.open('shots/'+a+'.png').convert('RGB').resize((402,874),Image.LANCZOS)
    fg=Image.open(F+f+'.png').convert('RGB').resize((402,874),Image.LANCZOS)
    d=ImageChops.difference(an,fg).convert('L'); score=sum(i*v for i,v in enumerate(d.histogram()))/(402*874)/255*100
    heat=ImageOps.colorize(d.point(lambda v:min(255,v*3)),'black','red')
    c=Image.new('RGB',(402*3+20,874+28),'white'); dr=ImageDraw.Draw(c)
    for i,(im,t) in enumerate([(fg,'Figma '+f.split('_')[0].replace('-',':')),(an,'Android '+a),(heat,'diff %.1f%%'%score)]):
        c.paste(im,(i*(402+10),28)); dr.text((i*412+4,8),t,fill='black')
    c.save('compare/'+a+'__vs__'+f+'.png'); out.append((a,f,round(score,1)))
json.dump(out,open('compare/scores.json','w'),indent=0); print(*out,sep='\n')
