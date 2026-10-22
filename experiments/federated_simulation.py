import json
import os
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

def main():
    os.makedirs('experiments/results', exist_ok=True)
    data = load_breast_cancer()
    X, y = data.data, data.target
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, stratify=y, random_state=42)
    
    # 1. Centralized Model
    centralized_model = LogisticRegression(max_iter=1000, random_state=42)
    centralized_model.fit(X_train, y_train)
    central_acc = accuracy_score(y_test, centralized_model.predict(X_test))
    
    # 2. Federated Learning Simulation (3 clients)
    num_clients = 3
    client_data_indices = np.array_split(np.arange(len(X_train)), num_clients)
    
    client_models = []
    for i in range(num_clients):
        indices = client_data_indices[i]
        model = LogisticRegression(max_iter=1000, random_state=42)
        model.fit(X_train[indices], y_train[indices])
        client_models.append(model)
        
    # FedAvg
    global_model = LogisticRegression(max_iter=1000, random_state=42)
    global_model.fit(X_train[:2], y_train[:2]) # Init shape
    
    global_model.coef_ = np.mean([m.coef_ for m in client_models], axis=0)
    global_model.intercept_ = np.mean([m.intercept_ for m in client_models], axis=0)
    
    fed_acc = accuracy_score(y_test, global_model.predict(X_test))
    
    results = {
        "Centralized_Accuracy": float(central_acc),
        "Federated_Global_Accuracy": float(fed_acc),
        "Accuracy_Loss": float(central_acc - fed_acc),
        "Num_Clients": num_clients
    }
    
    with open('experiments/results/federated_metrics.json', 'w') as f:
        json.dump(results, f, indent=4)
        
    print("Saved to experiments/results/federated_metrics.json")

if __name__ == "__main__":
    main()
