import type {MetadataRoute} from "next";
import {origin} from "@/lib/site";
export default function robots():MetadataRoute.Robots {
 const disallow=['/seller','/api/manage','/api/auth'];
 return {rules:['*','Googlebot','bingbot','OAI-SearchBot'].map(userAgent=>({userAgent,allow:'/',disallow})),sitemap:origin+'/sitemap.xml'};
}
