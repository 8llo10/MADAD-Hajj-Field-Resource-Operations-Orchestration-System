import type { IncidentSeverity } from '@prisma/client';
import model from './model.json' with { type: 'json' };

export type AiIncidentInput={severity:IncidentSeverity;ageMinutes:number;crowdDensity:number;siteCriticality:number;peopleAffected:number;availableTeamCount:number;requiredSkills:number;};
const sev={LOW:1,MEDIUM:2,HIGH:3,CRITICAL:4} as const;
const sigmoid=(z:number)=>1/(1+Math.exp(-Math.max(-30,Math.min(30,z))));
const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));

type W=Record<string,number>;
function vector(i:AiIncidentInput){return {severity:sev[i.severity]/4,age:Math.min(i.ageMinutes,180)/180,crowd:i.crowdDensity/5,criticality:i.siteCriticality/5,affected:Math.min(i.peopleAffected,100)/100,team_scarcity:1/(Math.max(0,i.availableTeamCount)+1),skills:Math.min(i.requiredSkills,4)/4};}
function predict(block:{intercept:number;weights:W},v:Record<string,number>){return sigmoid(block.intercept+Object.entries(block.weights).reduce((s,[k,w])=>s+w*(v[k]??0),0));}

export function analyzeIncident(i:AiIncidentInput){
 const v=vector(i);const risk=clamp(predict(model.risk as any,v));const sla=clamp(predict(model.sla as any,v));const e=model.eta;
 const eta=Math.max(8,Math.round(e.intercept+e.severity*sev[i.severity]+e.age*Math.min(i.ageMinutes,180)+e.crowd*i.crowdDensity+e.criticality*i.siteCriticality+e.affected*Math.min(i.peopleAffected,100)+e.team_scarcity*v.team_scarcity+e.skills*i.requiredSkills));
 const recommendations:string[]=[];
 if(sev[i.severity]>=3) recommendations.push('Escalate to command center and reserve a backup team.');
 if(i.crowdDensity>=4) recommendations.push('Use a crowd-aware access route and stage resources outside the densest corridor.');
 if(i.availableTeamCount<2) recommendations.push('Cross-zone support is recommended due to limited local capacity.');
 if(i.peopleAffected>=20) recommendations.push('Assign safety/medical support and establish a controlled perimeter.');
 if(sla>=.65) recommendations.push('Start an SLA recovery plan and increase status-check frequency.');
 if(!recommendations.length) recommendations.push('Standard dispatch with routine status checkpoints is appropriate.');
 return {riskScore:+risk.toFixed(3),slaBreachProbability:+sla.toFixed(3),estimatedResolutionMinutes:eta,summary:`${i.severity} incident; ML-estimated operational risk ${(risk*100).toFixed(0)}% and SLA breach probability ${(sla*100).toFixed(0)}%.`,recommendations,model:model.name,trainingData:model.training};
}
