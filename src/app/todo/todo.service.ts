import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ToDo } from '../models/todo.model';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private serverUrl = 'http://localhost:3000/todos';

  constructor(private readonly http: HttpClient) { }

  createTodo(todo: ToDo): Observable<ToDo>{
    return this.http.post<ToDo>(this.serverUrl, todo);
  };

  getTodo(id: number): Observable<ToDo>{
    console.log(this.serverUrl + '/' + id);
    return this.http.get<ToDo>(this.serverUrl + '/' + id);
  };

  getAllTodos(){
    return this.http.get<ToDo[]>(this.serverUrl);
  };

  updateTodo(todo: ToDo){
    return this.http.put<ToDo>(this.serverUrl + '/' + todo.id, todo)
  };

  deleteTodo(id: number){
    return this.http.delete<ToDo>(this.serverUrl + '/' + id);
  };

}
