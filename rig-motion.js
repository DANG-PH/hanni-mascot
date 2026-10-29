/* Shared cyclic joint model for offline six-frame export and live rendering. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object') module.exports = api;
  else root.HanniRig = api;
})(typeof window === 'undefined' ? this : window, () => {
  const joint = (center, radius, pivot, angle = 0, dx = 0, dy = 0, phase = 0) => ({center, radius, pivot, motion:[angle*Math.PI/180,dx,dy,phase]});
  const head = (angle=.6) => joint([256,172],[148,142],[256,278],angle,0,.5);
  const tail = () => joint([149,354],[77,91],[207,404],1.5,.5,0,1);
  const mouth = () => joint([291,239],[29,19],[291,252],0,0,1.6,.5);
  const configs = {
    'e00-nghi': {duration:2400, regions:[head(.25),tail()], action:'Thân và chân đứng yên; đầu nghiêng rất nhẹ, chóp đuôi chuyển động chậm.'},
    'e01-chao': {duration:1440, regions:[head(.5),joint([405,255],[68,80],[351,325],4,1,1.5),tail()], action:'Tay vẫy theo một cung nhỏ, đầu đáp nhẹ; thân và chân giữ nguyên.'},
    'e02-suy-nghi': {duration:1920, regions:[head(.8),joint([335,287],[40,48],[329,327],2,0,.8),tail()], action:'Nghiêng đầu suy nghĩ và chạm cằm nhẹ, không lắc cả người.'},
    'e04-vui-mung': {duration:1320, regions:[head(.6),joint([397,261],[68,82],[345,329],4,0,2),tail()], action:'Giơ tay ăn mừng theo nhịp, đầu đáp nhẹ và đuôi nhúc nhích; không nhảy cả thân.'},
    'e05-co-len': {duration:1680, regions:[head(.6),joint([351,294],[49,62],[322,339],3,0,1.5),tail()], action:'Nắm tay nhích lên động viên, gật nhẹ; áo và chân ổn định.'},
    'e09-lang-nghe': {duration:2160, regions:[head(.8),joint([368,216],[45,53],[340,282],2,0,1),tail()], action:'Đầu nghiêng nghe, tay bên tai chuyển động nhỏ và đều.'},
    'e10-doc-mau': {duration:1440, regions:[head(.45),joint([397,302],[67,61],[350,343],3,0,1),tail(),mouth()], action:'Tay giảng bài theo cung nhỏ, miệng cử động nhẹ, thân đứng yên.'},
    'e11-a-ha': {duration:1680, regions:[head(.6),joint([374,282],[48,61],[340,330],3,0,1.2),tail()], action:'Ngón tay chỉ lên nhích nhẹ, đầu gật đồng ý và đuôi theo sau.'},
    'e16-doc-sach': {duration:2400, regions:[head(.65),joint([319,320],[51,38],[292,351],.6,0,.5),tail()], action:'Đầu đọc theo nhịp chậm, góc sách dịch rất nhẹ; thân và chân giữ nguyên.'},
    'e19-tim-kiem': {duration:1920, regions:[head(.55),joint([346,245],[45,73],[328,315],2,1,1),tail()], action:'Kính lúp đi một vòng nhỏ trước cùng một mắt, không đổi tay.'},
    'e39-ghi-chu': {duration:1800, regions:[head(.45),joint([218,289],[39,54],[233,326],3,1,.8),tail()], action:'Một tay giữ sổ cố định, tay cầm bút viết theo nhịp nhỏ; luôn đủ hai tay.'},
    'e42-cham-chu': {duration:2400, regions:[head(.55),tail()], action:'Đầu cúi đáp rất nhẹ khi đọc câu hỏi; sách, thân và chân ổn định.'},
  };

  // A compact C1 weight has zero value and slope at its boundary. No cutout
  // seam, region crossfade, optical flow or redraw of the character is needed.
  function sourcePoint(x, y, phase, regions) {
    let sx=x, sy=y;
    if (y >= 430) return [sx,sy];
    for (const region of regions) {
      const {center:c,radius:r,pivot:p,motion:m} = region;
      const d=((x-c[0])/r[0])**2+((y-c[1])/r[1])**2;
      if (d >= 1) continue;
      const weight=(1-d)**2;
      const wave=Math.sin(phase+m[3]);
      const angle=m[0]*wave;
      const cos=Math.cos(angle), sin=Math.sin(angle);
      const px=x-p[0], py=y-p[1];
      sx+=weight*((cos-1)*px+sin*py-m[1]*wave);
      sy+=weight*(-sin*px+(cos-1)*py-m[2]*Math.cos(phase+m[3]));
    }
    return [sx,sy];
  }
  return {configs, sourcePoint};
});
