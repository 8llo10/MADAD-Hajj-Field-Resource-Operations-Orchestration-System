"""Train lightweight logistic models on deterministic synthetic operations data.
No external Python packages required. This is portfolio/demo data, not a production safety model.
"""
import json, math, random
from pathlib import Path
random.seed(42)
FEATURES=['severity','age','crowd','criticality','affected','team_scarcity','skills']

def sigmoid(z):
    z=max(-30,min(30,z)); return 1/(1+math.exp(-z))

def make(n=5000):
    rows=[]
    for _ in range(n):
        x=[random.randint(1,4),random.random()*180,random.randint(1,5),random.randint(1,5),random.randint(0,100),random.randint(0,4),random.randint(0,4)]
        sev,age,crowd,crit,aff,teams,skills=x
        scarcity=1/(teams+1)
        hidden=-4.4+sev*.70+(age/60)*.42+crowd*.30+crit*.22+(aff/50)*.32+scarcity*1.4+skills*.18
        p=sigmoid(hidden)
        y=1 if random.random()<p else 0
        # normalize features for training/runtime
        xn=[sev/4,age/180,crowd/5,crit/5,aff/100,scarcity,skills/4]
        rows.append((xn,y))
    return rows

def train(rows,epochs=160,lr=.45,l2=.01):
    w=[0.0]*len(FEATURES); b=0.0
    for _ in range(epochs):
        gw=[0.0]*len(w); gb=0.0
        for x,y in rows:
            pred=sigmoid(b+sum(a*c for a,c in zip(w,x))); e=pred-y
            gb+=e
            for j in range(len(w)): gw[j]+=e*x[j]
        n=len(rows); b-=lr*gb/n
        for j in range(len(w)): w[j]-=lr*(gw[j]/n+l2*w[j])
    return {'intercept':b,'weights':dict(zip(FEATURES,w))}

rows=make(); risk=train(rows)
# SLA uses same feature shape but intentionally stronger age/scarcity influence.
sla={'intercept':risk['intercept']-.25,'weights':dict(risk['weights'])}
sla['weights']['age']*=1.35; sla['weights']['team_scarcity']*=1.25
model={'name':'madad-synthetic-ops-logit-v1','training':'synthetic','featureOrder':FEATURES,'risk':risk,'sla':sla,'eta':{'intercept':12,'severity':8,'age':.04,'crowd':3,'criticality':1.5,'affected':.09,'team_scarcity':22,'skills':4}}
out=Path(__file__).parents[1]/'src/modules/ai/model.json';out.write_text(json.dumps(model,indent=2));print(out)
