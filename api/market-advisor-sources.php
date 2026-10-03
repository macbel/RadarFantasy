<?php
declare(strict_types=1);
/* Advisor-only sources. No RSS publisher labels, arbitrary origins or auto redirects. */
function mas_normalize(string $value): string {$ascii=iconv('UTF-8','ASCII//TRANSLIT//IGNORE',$value);return strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/',' ',$ascii===false?$value:$ascii)));}
function mas_limit(string $value,int $limit): string {if(function_exists('mb_substr'))return mb_substr($value,0,$limit);return preg_match('/^.{0,'.$limit.'}/us',$value,$m)?$m[0]:substr($value,0,$limit);}
function mas_absolute(string $url,string $base): string {
    $url=html_entity_decode(trim($url),ENT_QUOTES|ENT_HTML5,'UTF-8');if(preg_match('~^https?://~i',$url))return $url;$b=parse_url($base);if(!$b||empty($b['host']))return '';if(strpos($url,'//')===0)return 'https:'.$url;if(strpos($url,'/')===0)return 'https://'.$b['host'].$url;return 'https://'.$b['host'].preg_replace('~/[^/]*$~','/',($b['path']??'/')).$url;
}
function mas_origin(string $url): ?array {
    $u=parse_url($url);if(!$u||($u['scheme']??'')!=='https'||isset($u['user'])||isset($u['pass'])||isset($u['port'])&&$u['port']!==443)return null;
    $host=strtolower($u['host']??'');$sources=['www.futbolfantasy.com'=>'FutbolFantasy','futbolfantasy.com'=>'FutbolFantasy','www.jornadaperfecta.com'=>'Jornada Perfecta','jornadaperfecta.com'=>'Jornada Perfecta','biwenger.as.com'=>'Biwenger','www.biwenger.com'=>'Biwenger','biwenger.com'=>'Biwenger'];
    return isset($sources[$host])?['host'=>$host,'source'=>$sources[$host]]:null;
}
function mas_fetch(array $urls,float $deadline): array {
    if(!function_exists('curl_multi_init'))return [];$pending=[];foreach(array_slice(array_unique($urls),0,24)as$url)if(mas_origin($url))$pending[$url]=['url'=>$url,'hops'=>0];$result=[];
    while($pending&&microtime(true)<$deadline){$multi=curl_multi_init();$handles=[];$states=[];
        foreach($pending as$original=>$state){$u=$state['url'];$origin=mas_origin($u);if(!$origin)continue;$ips=gethostbynamel($origin['host']);if(!$ips)continue;$safe=true;foreach($ips as$ip)if(!filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE))$safe=false;if(!$safe)continue;
            $ch=curl_init($u);$states[$original]=['body'=>'','location'=>'','overflow'=>false];
            curl_setopt_array($ch,[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROXY=>'',CURLOPT_TIMEOUT_MS=>min(4000,max(1,(int)(($deadline-microtime(true))*1000))),CURLOPT_CONNECTTIMEOUT_MS=>2000,CURLOPT_RESOLVE=>[$origin['host'].':443:'.$ips[0]],CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_USERAGENT=>'Mozilla/5.0 RadarFantasy/market-advisor',CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_WRITEFUNCTION=>function($c,$chunk)use(&$states,$original){if(strlen($states[$original]['body'])+strlen($chunk)>524288){$states[$original]['overflow']=true;return 0;}$states[$original]['body'].=$chunk;return strlen($chunk);},CURLOPT_HEADERFUNCTION=>function($c,$line)use(&$states,$original){if(stripos($line,'Location:')===0)$states[$original]['location']=trim(substr($line,9));return strlen($line);}]);curl_multi_add_handle($multi,$ch);$handles[$original]=$ch;
        }
        do{$code=curl_multi_exec($multi,$active);if($active)curl_multi_select($multi,0.1);}while($active&&$code===CURLM_OK&&microtime(true)<$deadline);
        $next=[];foreach($handles as$original=>$ch){$http=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$state=$pending[$original];if(in_array($http,[301,302,303,307,308],true)&&$state['hops']<2){$target=mas_absolute($states[$original]['location'],$state['url']);if(mas_origin($target))$next[$original]=['url'=>$target,'hops'=>$state['hops']+1];}elseif($http===200&&!$states[$original]['overflow']&&curl_errno($ch)===0){$result[$original]=['url'=>$state['url'],'html'=>$states[$original]['body'],'status'=>200];}curl_multi_remove_handle($multi,$ch);curl_close($ch);}curl_multi_close($multi);$pending=$next;
    }return $result;
}
function mas_document(string $html): array {
    $doc=new DOMDocument();$old=libxml_use_internal_errors(true);$doc->loadHTML('<?xml encoding="UTF-8">'.$html);libxml_clear_errors();libxml_use_internal_errors($old);return [$doc,new DOMXPath($doc)];
}
function mas_date(string $value): ?string {if(ctype_digit($value)&&strlen($value)>=10)$t=(int)$value;else $t=strtotime($value);return $t!==false&&$t>0?gmdate('c',$t):null;}
function mas_recent(?string $date,int $now): bool {$t=$date?strtotime($date):false;return $t!==false&&$t<=$now+60&&$t>=$now-604800;}
function mas_matches(string $text,array $player): bool {
    $name=mas_normalize((string)($player['name']??''));$body=mas_normalize($text);if($name==='')return false;if(preg_match('/\b'.preg_quote($name,'/').'\b/u',$body))return true;
    foreach((array)($player['aliases']??[])as$alias)if(strlen($alias)>=5&&preg_match('/\b'.preg_quote(mas_normalize($alias),'/').'\b/u',$body))return true;
    $parts=array_filter(explode(' ',$name),fn($p)=>strlen($p)>=4);if(count($parts)>=2){$hit=0;foreach($parts as$p)if(preg_match('/\b'.preg_quote($p,'/').'\b/u',$body))$hit++;return $hit>=2;}return false;
}
function mas_player_excerpt(DOMXPath $xp,array $player,string $fallback): string {
    $found=[];foreach($xp->query('//*[contains(concat(" ",normalize-space(@class)," ")," entry-content ") or contains(concat(" ",normalize-space(@class)," ")," td-post-content ")]//*[self::p or self::h2 or self::h3 or self::li]')as$node){$content=trim(preg_replace('/\s+/u',' ',$node->textContent));if(mas_matches($content,$player)){$found[]=$content;$next=$node->nextSibling;while($next&&$next->nodeType!==XML_ELEMENT_NODE)$next=$next->nextSibling;if($next)$found[]=trim(preg_replace('/\s+/u',' ',$next->textContent));if(count($found)>=4)break;}}
    return mas_limit($found?implode(' | ',$found):$fallback,700);
}
function mas_article(array $page,array $player,int $now): ?array {
    $origin=mas_origin($page['url']);if(!$origin)return null;[$doc,$xp]=mas_document($page['html']);
    $canonical=$xp->evaluate('string(//link[contains(concat(" ",normalize-space(@rel)," ")," canonical ")]/@href)');$url=$canonical?mas_absolute($canonical,$page['url']):$page['url'];$co=mas_origin($url);if(!$co||$co['source']!==$origin['source']||strpos($url,'?s=')!==false)return null;
    $title=trim($xp->evaluate('string(//h1[1])'));if(!$title)$title=trim($xp->evaluate('string(//meta[@property="og:title"]/@content)'));if(!$title)return null;
    $date=mas_date($xp->evaluate('string(//meta[@property="article:published_time"]/@content)'));if(!$date)$date=mas_date($xp->evaluate('string(//time[@datetime and not(ancestor::li[starts-with(@id,"comment-")])][1]/@datetime)'));if(!mas_recent($date,$now))return null;
    $bodyNodes=$xp->query('//*[contains(concat(" ",normalize-space(@class)," ")," entry-content ") or contains(concat(" ",normalize-space(@class)," ")," td-post-content ")]');$body='';foreach($bodyNodes as$n)$body.=' '.$n->textContent;if(!$body)$body=$xp->evaluate('string(//article[1])');$body=trim(preg_replace('/\s+/u',' ',$body));
    if(!mas_matches($title.' '.$body,$player))return null;
    $excerpt=mas_player_excerpt($xp,$player,$body);$relevant=$title.' '.$excerpt;$explicit=preg_match('/\bBiwenger\b/i',$relevant)===1;$advice=preg_match('/comprar|vender|fichar|mantener|chollo|recomend|buy low|ventas fantasy/i',$title)===1||preg_match('/comprar|vender|pujar|mantendr|recomend|apostar por/i',$excerpt)===1||(preg_match('/mercado/i',$title)&&preg_match('/fantasy|biwenger/i',$title));
    $kind=$advice?'opinion':'news';$platform=$explicit?'biwenger':(preg_match('/comunio|futmondo|laliga fantasy/i',$title)?'other':'general');
    return ['title'=>mas_limit($title,240),'link'=>$url,'canonicalUrl'=>$url,'source'=>$origin['source'],'sourceHost'=>$co['host'],'sourceKind'=>$kind,'platform'=>$platform,'recommendationScope'=>$kind==='opinion'&&$explicit?'biwenger':'none','publishedAt'=>$date,'verifiedAt'=>gmdate('c',$now),'excerpt'=>$excerpt];
}
function mas_comments(array $page,array $player,int $now): array {
    $origin=mas_origin($page['url']);if(!$origin||$origin['source']!=='Jornada Perfecta')return ['items'=>[],'coverage'=>['threadsRead'=>0,'repliesRead'=>0,'verified'=>0,'unverified'=>0,'used'=>0]];
    [$doc,$xp]=mas_document($page['html']);$items=[];$coverage=['threadsRead'=>0,'repliesRead'=>0,'verified'=>0,'unverified'=>0,'used'=>0];
    $nodes=$xp->query('//li[starts-with(@id,"comment-")]');$read=0;
    foreach($nodes as$node){if(++$read>100)break;$parents=$xp->query('ancestor::li[starts-with(@id,"comment-")]',$node);if(!$parents->length){$coverage['threadsRead']++;continue;}$coverage['repliesRead']++;
        $parent=$parents->item($parents->length-1);$question=trim($xp->evaluate('string(./article//*[contains(concat(" ",normalize-space(@class)," ")," comment-content ")][1])',$parent));$answer=trim($xp->evaluate('string(./article//*[contains(concat(" ",normalize-space(@class)," ")," comment-content ")][1])',$node));if(!$question||!$answer)continue;
        $time=$xp->query('./article//time[1]',$node)->item(0);$date=$time?mas_date($time->getAttribute('datetime')?:$time->getAttribute('pubdate')):null;
        $author=trim($xp->evaluate('string(./article/footer/cite[1])',$node));$publicAttribution=mas_normalize($author)==='juanjo rivero';
        $classes=$node->getAttribute('class');$postAuthor=preg_match('/\bbypostauthor\b/',$classes)===1;
        $staff=preg_match('/\bbyuser\b/',$classes)&&preg_match('/\bcomment-author-juanjorivten\b/',$classes);$verified=$postAuthor||$staff;$coverage[$verified?'verified':'unverified']++;
        $thread=$question.' '.$answer;if(!mas_recent($date,$now)||!mas_matches($thread,$player))continue;$platform=preg_match('/\bBiwenger\b/i',$thread)?'biwenger':(preg_match('/comunio|futmondo|laliga fantasy/i',$thread)?'other':'general');
        $id=preg_replace('/[^0-9]/','',$node->getAttribute('id'));$link=preg_replace('/#.*$/','',$page['url']).'#comment-'.$id;
        $items[]=['title'=>'Consulta y respuesta sobre '.(string)$player['name'],'link'=>$link,'canonicalUrl'=>$link,'source'=>'Jornada Perfecta','sourceHost'=>$origin['host'],'sourceKind'=>'comment_reply','platform'=>$platform,'recommendationScope'=>$verified&&$platform==='biwenger'?'biwenger':'none','publishedAt'=>$date,'replyPublishedAt'=>$date,'verifiedAt'=>gmdate('c',$now),'excerpt'=>'Pregunta: '.mas_limit(preg_replace('/\s+/u',' ',$question),350).' Respuesta: '.mas_limit(preg_replace('/\s+/u',' ',$answer),350),'authorName'=>mas_limit($author,100),'authorRole'=>$staff?'editorial':($postAuthor?'post_author':($publicAttribution?'publicly_attributed':'unverified')),'authorVerification'=>$staff?'wordpress_registered_staff_profile':($postAuthor?'wordpress_bypostauthor':($publicAttribution?'public_staff_attribution_identity_unverified':'unknown')),'authorProfile'=>$staff||$publicAttribution?'https://www.jornadaperfecta.com/blog/author/juanjorivten/':null,'verificationSource'=>$staff||$publicAttribution?'https://www.jornadaperfecta.com/quienes-somos/':null,'parentId'=>$parent->getAttribute('id'),'commentId'=>'comment-'.$id];$coverage['used']++;
    }return ['items'=>$items,'coverage'=>$coverage];
}
function mas_fair_articles(array $candidates,array $players): array {
    $groups=['Jornada Perfecta'=>[],'FutbolFantasy'=>[],'Biwenger'=>[]];foreach($candidates as$url=>$owners){$o=mas_origin($url);if($o)$groups[$o['source']][$url]=$owners;}
    $selected=[];foreach(['Jornada Perfecta'=>12,'FutbolFantasy'=>2,'Biwenger'=>2]as$source=>$limit){$chosen=[];foreach(array_keys($players)as$i){foreach($groups[$source]as$url=>$owners){if(!isset($chosen[$url])&&in_array($i,$owners,true)){$chosen[$url]=true;break;}}if(count($chosen)>=$limit)break;}foreach($groups[$source]as$url=>$owners){if(count($chosen)>=$limit)break;$chosen[$url]=true;}foreach($chosen as$url=>$yes)$selected[$url]=true;}
    foreach($candidates as$url=>$owners){if(count($selected)>=16)break;$selected[$url]=true;}return array_keys($selected);
}
function market_advisor_sources(array $players,string $competition,array $knownArticles=[]): array {
    $frequency=[];foreach($players as$p){$parts=explode(' ',mas_normalize((string)$p['name']));$last=end($parts);if(count($parts)>1&&strlen($last)>=5)$frequency[$last]=($frequency[$last]??0)+1;}foreach($players as&$p){$p['aliases']=[];$parts=explode(' ',mas_normalize((string)$p['name']));$last=end($parts);if(count($parts)>1&&strlen($last)>=5&&($frequency[$last]??0)===1)$p['aliases'][]=$last;}unset($p);
    $now=time();$deadline=microtime(true)+16;$urls=['https://www.jornadaperfecta.com/blog/','https://www.jornadaperfecta.com/blog/categoria/biwenger/'];$mapping=[];$all=array_keys($players);foreach($urls as$url)$mapping[$url]=$all;
    /* Public search currently times out on this host. It is opt-in and never the only JP discovery. */
    if(getenv('FMS_MARKET_ADVISOR_JP_SEARCH')==='1')foreach(array_slice($players,0,4,true)as$i=>$p){$url='https://www.jornadaperfecta.com/blog/?s='.rawurlencode((string)$p['name']);$urls[]=$url;$mapping[$url][]=$i;}
    /* Fair cross-source supplements alternate market/own samples, after all JP searches. */
    $indices=array_keys($players);usort($indices,fn($a,$b)=>($a%8)*2+(int)floor($a/8)<=>($b%8)*2+(int)floor($b/8));
    foreach($indices as$n=>$i){$p=$players[$i];$group=$n%4<2?favorite_news_futbolfantasy_urls($p,$competition):favorite_news_biwenger_urls($p);foreach(array_slice($group,0,1)as$url){if(!mas_origin($url))continue;$urls[]=$url;$mapping[$url][]=$i;}}
    $pages=mas_fetch(array_slice(array_unique($urls),0,24),$deadline);$candidates=[];
    foreach(array_slice($knownArticles,0,8)as$url){if(is_string($url))$url=preg_replace('/#.*$/','',$url);$o=is_string($url)?mas_origin($url):null;if($o&&$o['source']==='Jornada Perfecta')$candidates[$url]=$all;}
    foreach($pages as$original=>$page){$source=mas_origin($page['url'])['source'];
        if($source==='Jornada Perfecta'){[$doc,$xp]=mas_document($page['html']);$links=$xp->query('//*[contains(concat(" ",normalize-space(@class)," ")," entry-title ")]//a[@href]');$discovered=[];foreach($links as$link){$url=mas_absolute($link->getAttribute('href'),$page['url']);$o=mas_origin($url);if($o&&$o['source']==='Jornada Perfecta'&&strpos($url,'/blog/')!==false&&strpos($url,'/categoria/')===false)$discovered[$url]=['title'=>$link->textContent,'priority'=>preg_match('/mercado|fichajes|chollo|buy.low|vender|ventas|recomend|compras/i',$link->textContent)?0:1];}
            uasort($discovered,fn($a,$b)=>$a['priority']<=>$b['priority']);foreach(array_slice($discovered,0,8,true)as$url=>$item)$candidates[$url]=$all;continue;}
        foreach($mapping[$original]??[]as$i){$articles=$source==='FutbolFantasy'?favorite_news_parse_ff_html($page['html'],$page['url'],$players[$i]):favorite_news_parse_biwenger_html($page['html'],$players[$i]);foreach(array_slice($articles,0,4)as$a)if(mas_origin($a['link']))$candidates[$a['link']][]=$i;}
    }
    $fair=mas_fair_articles($candidates,$players);
    $articlePages=mas_fetch($fair,$deadline);$result=[];$counted=[];$used=[];$coverage=['sourcePagesRequested'=>min(24,count(array_unique($urls))),'sourcePagesRead'=>count($pages),'articlePagesRead'=>count($articlePages),'threadsRead'=>0,'repliesRead'=>0,'verified'=>0,'unverified'=>0,'used'=>0,'warnings'=>[]];
    foreach($players as$i=>$p){$articles=[];foreach($articlePages as$url=>$page){if(!in_array($i,$candidates[$url]??[],true))continue;$comments=mas_comments($page,$p,$now);foreach($comments['items']as$c)$articles[$c['link']]=$c;if(!isset($counted[$url])){foreach($comments['coverage']as$k=>$v)if($k!=='used')$coverage[$k]+=$v;$counted[$url]=true;}$a=mas_article($page,$p,$now);if($a)$articles[$a['link']]=$a;}
        usort($articles,fn($a,$b)=>(($b['sourceKind']==='comment_reply')<=>($a['sourceKind']==='comment_reply'))?:strcmp($b['publishedAt'],$a['publishedAt']));$selected=array_slice(array_values($articles),0,4);foreach($selected as$a)if($a['sourceKind']==='comment_reply')$used[$a['link']]=true;$result[]=['key'=>$p['key']??'','name'=>$p['name'],'biwengerPlayerId'=>$p['biwengerPlayerId']??null,'articles'=>$selected];}
    $coverage['used']=count($used);
    if(count($pages)<$coverage['sourcePagesRequested'])$coverage['warnings'][]='Cobertura parcial: alguna fuente rechazó o agotó la consulta HTTPS.';
    $coverage['warnings'][]='Comentarios: sólo se lee la página pública inicial (máximo 100 comentarios por artículo); identidad sin señal verificable no se atribuye a redacción.';
    return ['generatedAt'=>gmdate('c',$now),'players'=>$result,'coverage'=>$coverage];
}
