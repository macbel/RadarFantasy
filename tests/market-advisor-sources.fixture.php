<?php
declare(strict_types=1);
require dirname(__DIR__) . '/api/market-advisor-sources.php';
function check($yes,string $label): void {if(!$yes)throw new RuntimeException($label);}
$now=strtotime('2026-10-03T12:00:00Z');$reply=$now-3600;
function thread(string $question,string $answer,string $classes='',?int $date=null,string $author='Lector'): string {
    $time=$date===null?'':('<time pubdate="'.$date.'">fecha</time>');
    return '<li id="comment-1" class="comment"><article><footer><cite>Consulta</cite><time pubdate="1000000000">viejo</time></footer><div class="comment-content">'.$question.'</div></article><ul class="children"><li id="comment-2" class="comment '.$classes.'"><article><footer><cite>'.$author.'</cite>'.$time.'</footer><div class="comment-content">'.$answer.'</div></article></li></ul></li>';
}
$url='https://www.jornadaperfecta.com/blog/old-article/';
$html='<meta property="article:published_time" content="2000-01-01"><h1>Artículo antiguo</h1>'.thread('En Biwenger, vender a Güler para fichar a Fermín?','Sí','',$reply);
$data=mas_comments(['url'=>$url,'html'=>$html],['name'=>'Fermín'],$now);
check(count($data['items'])===1,'old article fresh response retained');$a=$data['items'][0];
check($a['platform']==='biwenger'&&$a['authorRole']==='unverified'&&$a['recommendationScope']==='none','unverified reader never editorial');
check(strpos($a['excerpt'],'vender a Güler')!==false&&strpos($a['excerpt'],'Respuesta: Sí')!==false,'short reply linked question retained');
check($a['replyPublishedAt']===gmdate('c',$reply)&&$a['link']===$url.'#comment-2','own date and exact permalink');
$verified=mas_comments(['url'=>$url,'html'=>thread('Fermín o Güler para Biwenger?','Fermín','byuser comment-author-juanjorivten',$reply,'Juanjo Rivero')],['name'=>'Fermín'],$now);
check($verified['items'][0]['authorRole']==='editorial'&&$verified['coverage']['verified']===1,'registered narrow staff registry');
$attributed=mas_comments(['url'=>$url,'html'=>thread('Fermín o Güler para Biwenger?','Fermín','',$reply,'Juanjo Rivero')],['name'=>'Fermín'],$now);
check($attributed['items'][0]['authorRole']==='publicly_attributed'&&$attributed['coverage']['verified']===0,'display name alone remains unverified');
$comunio=mas_comments(['url'=>$url,'html'=>thread('Fermín o Güler en Comunio?','Fermín','bypostauthor',$reply)],['name'=>'Fermín'],$now);
check($comunio['items'][0]['platform']==='other'&&$comunio['items'][0]['recommendationScope']==='none','Comunio not Biwenger');
check(count(mas_comments(['url'=>$url,'html'=>thread('Fermín en Biwenger?','Sí')],['name'=>'Fermín'],$now)['items'])===0,'no reply date never inherit article');
check(!mas_matches('Compraría el disco',['name'=>'Isco']),'word boundaries');
check(mas_matches('Para Biwenger Guler o Rodrygo?',['name'=>'Arda Güler','aliases'=>['guler']]),'unique real player short-name alias matches question');
check(!mas_matches('Vender a Borja Mayoral',['name'=>'Borja Iglesias','aliases'=>['iglesias']]),'shared first name never aliases another real player');
check(mas_origin('https://news.google.com/rss/articles/a')===null&&mas_origin('https://www.jornadaperfecta.com.evil.test/a')===null&&mas_origin('http://www.futbolfantasy.com/a')===null,'origins allowlist');
$many=[];foreach(range(1,16)as$i)$many['https://www.jornadaperfecta.com/blog/article-'.$i.'/']=[0,1];foreach(range(1,3)as$i){$many['https://www.futbolfantasy.com/noticias/'.$i]=[0];$many['https://biwenger.as.com/blog/article-'.$i.'/']=[1];}
$fair=mas_fair_articles($many,[['name'=>'A'],['name'=>'B']]);check(count($fair)===16&&count(array_filter($fair,fn($url)=>mas_origin($url)['source']==='FutbolFantasy'))===2&&count(array_filter($fair,fn($url)=>mas_origin($url)['source']==='Biwenger'))===2,'fair source budgets preserve FF and Biwenger');
$article=['url'=>'https://www.futbolfantasy.com/noticias/123-isco','html'=>'<link rel="canonical" href="https://www.futbolfantasy.com/noticias/123-isco"><meta property="article:published_time" content="2026-10-03T10:00:00Z"><h1>Isco sigue entrenando al margen</h1><article><div class="entry-content">Isco no entrenó con el grupo.</div></article>'];
$news=mas_article($article,['name'=>'Isco'],$now);check($news['sourceKind']==='news'&&$news['recommendationScope']==='none','sports health not fantasy advice');
$article['html']=str_replace('https://www.futbolfantasy.com/noticias/123-isco','https://evil.test/article',$article['html']);check(mas_article($article,['name'=>'Isco'],$now)===null,'canonical origin mismatch');
echo "Advisor sources: canonical origin, article kinds, dated parent-linked comments, roles, platform and empty coverage passed\n";
